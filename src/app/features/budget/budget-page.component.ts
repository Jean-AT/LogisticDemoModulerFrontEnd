import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { normalizeApiError } from '../../core/api-error';
import { IdempotencyService } from '../../core/idempotency.service';
import { NotificationService } from '../../core/notification.service';
import { formatAmount } from '../../core/utils';
import { WorkspaceContextService } from '../../core/workspace-context.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { PlatformCatalogEntry } from '../platform/platform.models';
import { PlatformService } from '../platform/platform.service';
import { BudgetAvailability, BudgetControlRequest, BudgetOperationResult } from './budget.models';
import { BudgetService } from './budget.service';

interface CatalogState {
  loading: boolean;
  error: string | null;
  costCenters: PlatformCatalogEntry[];
  financingSources: PlatformCatalogEntry[];
  goals: PlatformCatalogEntry[];
  expenseClassifiers: PlatformCatalogEntry[];
}

type DimensionControls = {
  month: FormControl<number>;
  costCenterId: FormControl<number | null>;
  financingSourceId: FormControl<number | null>;
  goalId: FormControl<number | null>;
  expenseClassifierId: FormControl<number | null>;
  currency: FormControl<string>;
};

interface DimensionFormLike {
  controls: DimensionControls;
}

@Component({
  selector: 'app-budget-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="Presupuesto"
      subtitle="PIA/PIM, disponibilidad y controles manuales disponibles en los contratos actuales."
    >
      <button actions mat-stroked-button type="button" [disabled]="!canUseContext() || catalogs().loading" (click)="loadCatalogs()">
        <mat-icon>sync</mat-icon>
        Catalogos
      </button>
    </app-page-header>

    @if (!canUseContext()) {
      <div class="warning-box">
        <mat-icon>priority_high</mat-icon>
        Selecciona una compania con ID valido antes de usar Presupuesto.
      </div>
    }

    @if (catalogs().loading) {
      <div class="inline-state"><mat-spinner diameter="24" /> Cargando dimensiones...</div>
    }

    @if (catalogs().error) {
      <div class="error-box">{{ catalogs().error }}</div>
    }

    <mat-tab-group animationDuration="160ms">
      <mat-tab label="PIA">
        <section class="tab-panel two-column">
          <article class="section">
            <h3>Acciones PIA</h3>
            <p>Estas operaciones dependen de unidades transferidas desde Cuadro.</p>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Notas</mat-label>
              <textarea matInput rows="3" [formControl]="piaNotes"></textarea>
            </mat-form-field>
            <div class="action-row">
              <button mat-flat-button class="btn-primary" type="button" [disabled]="!canUseContext() || piaLoading()" (click)="runPia('generate')">
                <mat-icon>playlist_add</mat-icon>
                Generar PIA
              </button>
              <button mat-stroked-button type="button" [disabled]="!canUseContext() || piaLoading()" (click)="runPia('review')">
                <mat-icon>rate_review</mat-icon>
                Revisar
              </button>
              <button mat-flat-button class="btn-primary" type="button" [disabled]="!canUseContext() || piaLoading()" (click)="runPia('approve')">
                <mat-icon>verified</mat-icon>
                Aprobar
              </button>
            </div>
            @if (piaLoading()) {
              <div class="inline-state"><mat-spinner diameter="22" /> Ejecutando accion...</div>
            }
            @if (lastPiaResult()) {
              <pre class="json-box">{{ json(lastPiaResult()?.raw) }}</pre>
            }
          </article>

          <article class="section muted-section">
            <h3>Brecha BE-FE05</h3>
            <p>
              Aun no existen GET para consultar planes PIA/PIM, lineas, revisiones, movimientos ni controles.
              Por eso esta pantalla ejecuta acciones reales y muestra la respuesta, pero no inventa una bandeja persistida.
            </p>
          </article>
        </section>
      </mat-tab>

      <mat-tab label="Disponibilidad">
        <section class="tab-panel">
          <article class="section">
            <h3>Consulta de disponibilidad</h3>
            <form class="grid-form" [formGroup]="availabilityForm" (ngSubmit)="queryAvailability()">
              <mat-form-field appearance="outline">
                <mat-label>Mes</mat-label>
                <mat-select formControlName="month">
                  @for (month of months; track month.value) {
                    <mat-option [value]="month.value">{{ month.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <ng-container *ngTemplateOutlet="dimensionFields; context: { form: availabilityForm }" />
              <mat-form-field appearance="outline">
                <mat-label>Moneda</mat-label>
                <mat-select formControlName="currency">
                  <mat-option value="PEN">PEN</mat-option>
                  <mat-option value="USD">USD</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button class="btn-primary" type="submit" [disabled]="availabilityForm.invalid || availabilityLoading() || !catalogsReady()">
                <mat-icon>search</mat-icon>
                Consultar
              </button>
            </form>

            @if (availabilityLoading()) {
              <div class="inline-state"><mat-spinner diameter="22" /> Consultando disponibilidad...</div>
            }
            @if (availabilityError()) {
              <div class="error-box">{{ availabilityError() }}</div>
            }
            @if (availability()) {
              <div class="availability">
                <div><span>PIA</span><strong>{{ money(availability()?.initial) }}</strong></div>
                <div><span>PIM</span><strong>{{ money(availability()?.modified) }}</strong></div>
                <div><span>Comprometido</span><strong>{{ money(availability()?.committed) }}</strong></div>
                <div><span>Disponible</span><strong>{{ money(availability()?.available) }}</strong></div>
              </div>
              <pre class="json-box">{{ json(availability()?.raw) }}</pre>
            }
          </article>
        </section>
      </mat-tab>

      <mat-tab label="Controles manuales">
        <section class="tab-panel two-column">
          <article class="section">
            <h3>Precompromiso manual</h3>
            <form class="grid-form" [formGroup]="controlForm" (ngSubmit)="precommit()">
              <mat-form-field appearance="outline">
                <mat-label>Mes</mat-label>
                <mat-select formControlName="month">
                  @for (month of months; track month.value) {
                    <mat-option [value]="month.value">{{ month.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <ng-container *ngTemplateOutlet="dimensionFields; context: { form: controlForm }" />
              <mat-form-field appearance="outline">
                <mat-label>Moneda</mat-label>
                <mat-select formControlName="currency">
                  <mat-option value="PEN">PEN</mat-option>
                  <mat-option value="USD">USD</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Monto</mat-label>
                <input matInput type="number" min="0.01" step="0.01" formControlName="amount" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo documento</mat-label>
                <input matInput formControlName="sourceDocumentType" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>ID documento</mat-label>
                <input matInput formControlName="sourceDocumentId" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Motivo</mat-label>
                <input matInput formControlName="reason" />
              </mat-form-field>
              <button mat-flat-button class="btn-primary" type="submit" [disabled]="controlForm.invalid || controlLoading() || !catalogsReady()">
                <mat-icon>lock</mat-icon>
                Precomprometer
              </button>
            </form>
            @if (controlKey()) {
              <div class="notice">
                <mat-icon>vpn_key</mat-icon>
                Idempotency-Key activo: <strong>{{ controlKey() }}</strong>
              </div>
            }
            @if (controlResult()) {
              <pre class="json-box">{{ json(controlResult()?.raw) }}</pre>
            }
          </article>

          <article class="section">
            <h3>Commit / Release</h3>
            <div class="grid-form">
              <mat-form-field appearance="outline">
                <mat-label>ID control</mat-label>
                <input matInput type="number" min="1" [formControl]="controlId" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Motivo de liberacion</mat-label>
                <input matInput [formControl]="releaseReason" />
              </mat-form-field>
              <button mat-flat-button class="btn-primary" type="button" [disabled]="controlId.invalid || controlLoading()" (click)="commitControl()">
                <mat-icon>done_all</mat-icon>
                Commit
              </button>
              <button mat-flat-button class="btn-danger" type="button" [disabled]="controlId.invalid || releaseReason.invalid || controlLoading()" (click)="releaseControl()">
                <mat-icon>lock_open</mat-icon>
                Release
              </button>
            </div>
            <p class="muted">
              Estas acciones afectan controles reales. El flujo normal de requerimiento/OC debe usar las operaciones automaticas del backend.
            </p>
          </article>
        </section>
      </mat-tab>
    </mat-tab-group>

    <ng-template #dimensionFields let-form="form">
      <mat-form-field appearance="outline">
        <mat-label>Centro de costo</mat-label>
        <mat-select [formControl]="$any(form).controls.costCenterId">
          @for (entry of catalogs().costCenters; track entry.id) {
            <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Fuente</mat-label>
        <mat-select [formControl]="$any(form).controls.financingSourceId">
          @for (entry of catalogs().financingSources; track entry.id) {
            <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Meta</mat-label>
        <mat-select [formControl]="$any(form).controls.goalId">
          @for (entry of catalogs().goals; track entry.id) {
            <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Clasificador</mat-label>
        <mat-select [formControl]="$any(form).controls.expenseClassifierId">
          @for (entry of catalogs().expenseClassifiers; track entry.id) {
            <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </ng-template>
  `,
  styles: [
    `
      .tab-panel { padding: 20px 0 8px; display: grid; gap: 16px; }
      .two-column { grid-template-columns: minmax(0, 1fr) minmax(280px, 380px); align-items: start; }
      .section {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        padding: 16px;
      }
      h3 { margin: 0 0 8px; font-size: 16px; }
      p { margin: 6px 0 0; color: var(--color-text-soft); line-height: 1.45; }
      .full, .wide { width: 100%; }
      .grid-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        align-items: center;
      }
      .action-row { display: flex; flex-wrap: wrap; gap: 10px; }
      .inline-state, .warning-box, .error-box, .notice {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 8px;
        padding: 14px;
      }
      .inline-state { color: var(--color-text-soft); }
      .warning-box { margin-bottom: 16px; background: #fff8eb; color: #8a5a05; }
      .error-box { background: #fde8ec; color: var(--color-danger); }
      .notice { margin-top: 12px; background: var(--color-primary-soft); color: var(--color-primary-strong); }
      .muted-section { background: #fbfafc; }
      .muted { color: var(--color-text-soft); }
      .availability {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .availability div {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 12px;
      }
      .availability span { display: block; color: var(--color-text-soft); font-size: 12px; text-transform: uppercase; }
      .availability strong { font-size: 20px; font-variant-numeric: tabular-nums; }
      .json-box {
        max-height: 300px;
        overflow: auto;
        margin-top: 12px;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: #fbfafc;
        white-space: pre-wrap;
      }
      @media (max-width: 900px) {
        .two-column { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class BudgetPageComponent {
  private readonly budget = inject(BudgetService);
  private readonly platform = inject(PlatformService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  private readonly idempotency = inject(IdempotencyService);
  readonly workspace = inject(WorkspaceContextService);

  readonly months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  readonly catalogs = signal<CatalogState>({
    loading: false,
    error: null,
    costCenters: [],
    financingSources: [],
    goals: [],
    expenseClassifiers: [],
  });
  readonly catalogsReady = computed(
    () =>
      this.catalogs().costCenters.length > 0 &&
      this.catalogs().financingSources.length > 0 &&
      this.catalogs().goals.length > 0 &&
      this.catalogs().expenseClassifiers.length > 0,
  );

  readonly piaNotes = new FormControl('', { nonNullable: true });
  readonly piaLoading = signal(false);
  readonly lastPiaResult = signal<BudgetOperationResult | null>(null);

  readonly availabilityForm = this.createDimensionForm();
  readonly availabilityLoading = signal(false);
  readonly availabilityError = signal<string | null>(null);
  readonly availability = signal<BudgetAvailability | null>(null);

  readonly controlForm = this.createControlForm();
  readonly controlLoading = signal(false);
  readonly controlKey = signal<string | null>(null);
  readonly controlResult = signal<BudgetOperationResult | null>(null);
  readonly controlId = new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] });
  readonly releaseReason = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  constructor() {
    this.loadCatalogs();
  }

  loadCatalogs(): void {
    const companyId = this.workspace.companyId();
    if (!companyId) return;

    this.catalogs.update((state) => ({ ...state, loading: true, error: null }));
    let pending = 4;
    const done = () => {
      pending -= 1;
      if (pending === 0) this.catalogs.update((state) => ({ ...state, loading: false }));
    };
    const fail = (error: unknown) => {
      this.catalogs.update((state) => ({ ...state, loading: false, error: normalizeApiError(error).detail }));
    };

    this.platform.listCatalog('costCenters', companyId, this.workspace.fiscalYear()).subscribe({
      next: (costCenters) => this.catalogs.update((state) => ({ ...state, costCenters })),
      error: fail,
      complete: done,
    });
    this.platform.listCatalog('financingSources', companyId, this.workspace.fiscalYear()).subscribe({
      next: (financingSources) => this.catalogs.update((state) => ({ ...state, financingSources })),
      error: fail,
      complete: done,
    });
    this.platform.listCatalog('goals', companyId, this.workspace.fiscalYear()).subscribe({
      next: (goals) => this.catalogs.update((state) => ({ ...state, goals })),
      error: fail,
      complete: done,
    });
    this.platform.listCatalog('expenseClassifiers', companyId, this.workspace.fiscalYear()).subscribe({
      next: (expenseClassifiers) => this.catalogs.update((state) => ({ ...state, expenseClassifiers })),
      error: fail,
      complete: done,
    });
  }

  runPia(action: 'generate' | 'review' | 'approve'): void {
    const companyId = this.workspace.companyId();
    if (!companyId) return;

    const labels = { generate: 'Generar PIA', review: 'Revisar PIA', approve: 'Aprobar PIA' };
    this.confirm
      .confirm({
        title: labels[action],
        message: `${labels[action]} para ${this.workspace.fiscalYear()}. El backend validara unidades transferidas y estado actual.`,
        confirmText: labels[action],
        danger: action === 'approve',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.piaLoading.set(true);
        const request = { companyId, fiscalYear: this.workspace.fiscalYear(), notes: this.piaNotes.value };
        const call =
          action === 'generate'
            ? this.budget.generatePia(request)
            : action === 'review'
              ? this.budget.reviewPia(request)
              : this.budget.approvePia(request);
        call.pipe(finalize(() => this.piaLoading.set(false))).subscribe({
          next: (result) => {
            this.lastPiaResult.set(result);
            this.notify.success(`${labels[action]} ejecutado correctamente.`);
          },
          error: (error: unknown) => this.notify.error(error),
        });
      });
  }

  queryAvailability(): void {
    const companyId = this.workspace.companyId();
    if (!companyId || this.availabilityForm.invalid) return;

    this.availabilityError.set(null);
    this.availabilityLoading.set(true);
    this.budget
      .getAvailability({ companyId, fiscalYear: this.workspace.fiscalYear(), ...this.dimensionPayload(this.availabilityForm) })
      .pipe(finalize(() => this.availabilityLoading.set(false)))
      .subscribe({
        next: (availability) => this.availability.set(availability),
        error: (error: unknown) => {
          this.availability.set(null);
          this.availabilityError.set(normalizeApiError(error).detail);
        },
      });
  }

  precommit(): void {
    const companyId = this.workspace.companyId();
    if (!companyId || this.controlForm.invalid) return;

    this.confirm
      .confirm({
        title: 'Precomprometer presupuesto',
        message: 'Esta accion crea un control presupuestal manual. No duplica el flujo automatico de aprobacion.',
        confirmText: 'Precomprometer',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        const key = this.controlKey() ?? this.idempotency.createKey();
        this.controlKey.set(key);
        this.controlLoading.set(true);
        this.budget
          .precommit(this.controlPayload(companyId), key)
          .pipe(finalize(() => this.controlLoading.set(false)))
          .subscribe({
            next: (result) => {
              this.controlResult.set(result);
              this.controlKey.set(null);
              this.notify.success('Precompromiso registrado.');
            },
            error: (error: unknown) => this.notify.error(error),
          });
      });
  }

  commitControl(): void {
    const id = this.controlId.value;
    if (!id) return;

    const key = this.idempotency.createKey();
    this.controlLoading.set(true);
    this.budget
      .commit(id, { reason: 'Commit manual desde UI V2' }, key)
      .pipe(finalize(() => this.controlLoading.set(false)))
      .subscribe({
        next: (result) => {
          this.controlResult.set(result);
          this.notify.success('Control comprometido.');
        },
        error: (error: unknown) => this.notify.error(error),
      });
  }

  releaseControl(): void {
    const id = this.controlId.value;
    if (!id) return;

    this.confirm
      .confirm({
        title: 'Liberar control',
        message: 'Liberar un control presupuestal modifica saldos reales. Confirma solo si corresponde.',
        confirmText: 'Liberar',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        const key = this.idempotency.createKey();
        this.controlLoading.set(true);
        this.budget
          .release(id, { reason: this.releaseReason.value }, key)
          .pipe(finalize(() => this.controlLoading.set(false)))
          .subscribe({
            next: (result) => {
              this.controlResult.set(result);
              this.notify.success('Control liberado.');
            },
            error: (error: unknown) => this.notify.error(error),
          });
      });
  }

  numericId(entry: PlatformCatalogEntry): number | null {
    const value = Number(entry.id);
    return Number.isFinite(value) ? value : null;
  }

  canUseContext(): boolean {
    return this.workspace.companyId() !== null;
  }

  money(value: number | undefined): string {
    return formatAmount(value ?? 0);
  }

  json(value: unknown): string {
    return JSON.stringify(value ?? {}, null, 2);
  }

  private createDimensionForm(): FormGroup<DimensionControls> {
    return new FormGroup({
      month: new FormControl(new Date().getMonth() + 1, { nonNullable: true, validators: [Validators.required] }),
      costCenterId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      financingSourceId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      goalId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      expenseClassifierId: new FormControl<number | null>(null, { validators: [Validators.required] }),
      currency: new FormControl('PEN', { nonNullable: true, validators: [Validators.required] }),
    });
  }

  private createControlForm(): FormGroup<{
    month: FormControl<number>;
    costCenterId: FormControl<number | null>;
    financingSourceId: FormControl<number | null>;
    goalId: FormControl<number | null>;
    expenseClassifierId: FormControl<number | null>;
    currency: FormControl<string>;
    amount: FormControl<number | null>;
    sourceDocumentType: FormControl<string>;
    sourceDocumentId: FormControl<string>;
    reason: FormControl<string>;
  }> {
    return new FormGroup({
      ...this.createDimensionForm().controls,
      amount: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
      sourceDocumentType: new FormControl('MANUAL', { nonNullable: true, validators: [Validators.required] }),
      sourceDocumentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      reason: new FormControl('', { nonNullable: true }),
    });
  }

  private dimensionPayload(form: DimensionFormLike) {
    return {
      month: form.controls.month.value,
      costCenterId: requiredNumber(form.controls.costCenterId.value),
      financingSourceId: requiredNumber(form.controls.financingSourceId.value),
      goalId: requiredNumber(form.controls.goalId.value),
      expenseClassifierId: requiredNumber(form.controls.expenseClassifierId.value),
      currency: form.controls.currency.value,
    };
  }

  private controlPayload(companyId: number): BudgetControlRequest {
    return {
      companyId,
      fiscalYear: this.workspace.fiscalYear(),
      ...this.dimensionPayload(this.controlForm),
      amount: requiredNumber(this.controlForm.controls.amount.value),
      sourceDocumentType: this.controlForm.controls.sourceDocumentType.value,
      sourceDocumentId: this.controlForm.controls.sourceDocumentId.value,
      reason: this.controlForm.controls.reason.value,
    };
  }
}

function requiredNumber(value: number | null): number {
  if (value === null) throw new Error('Valor numerico requerido.');
  return value;
}
