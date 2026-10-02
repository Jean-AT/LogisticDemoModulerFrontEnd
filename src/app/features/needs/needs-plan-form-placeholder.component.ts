import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { normalizeApiError } from '../../core/api-error';
import { NotificationService } from '../../core/notification.service';
import { WorkspaceContextService } from '../../core/workspace-context.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { PlatformCatalogEntry } from '../platform/platform.models';
import { PlatformService } from '../platform/platform.service';
import { NeedsPlan, NeedsPlanDetailRequest, NeedsPlanLine, NeedsPlanMonthlyQuantityRequest } from './needs.models';
import { NeedsService } from './needs.service';

type MonthControlGroup = FormGroup<{
  month: FormControl<number>;
  requestedQuantity: FormControl<number>;
}>;

type DetailControlGroup = FormGroup<{
  itemCode: FormControl<string>;
  unitCode: FormControl<string>;
  costCenterId: FormControl<number | null>;
  financingSourceId: FormControl<number | null>;
  goalId: FormControl<number | null>;
  expenseClassifierId: FormControl<number | null>;
  monthlyQuantities: FormArray<MonthControlGroup>;
}>;

type PlanFormGroup = FormGroup<{
  description: FormControl<string>;
  details: FormArray<DetailControlGroup>;
}>;

interface CatalogState {
  loading: boolean;
  error: string | null;
  items: PlatformCatalogEntry[];
  costCenters: PlatformCatalogEntry[];
  financingSources: PlatformCatalogEntry[];
  goals: PlatformCatalogEntry[];
  expenseClassifiers: PlatformCatalogEntry[];
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

@Component({
  selector: 'app-needs-plan-form-placeholder',
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
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      [title]="isEdit() ? 'Editar Cuadro' : 'Nuevo Cuadro'"
      subtitle="Registro de lineas con doce meses exactos y dimensiones de Plataforma."
    >
      <button actions mat-stroked-button type="button" (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Volver
      </button>
      <button actions mat-stroked-button type="button" (click)="reloadCatalogs()" [disabled]="!canUseContext() || catalogs().loading">
        <mat-icon>sync</mat-icon>
        Catalogos
      </button>
    </app-page-header>

    @if (!canUseContext()) {
      <div class="warning-box">
        <mat-icon>priority_high</mat-icon>
        Selecciona una compania con ID valido antes de registrar un Cuadro.
      </div>
    }

    @if (catalogs().loading || loadingPlan()) {
      <div class="inline-state"><mat-spinner diameter="24" /> Preparando formulario...</div>
    }

    @if (catalogs().error) {
      <div class="error-box">
        <span>{{ catalogs().error }}</span>
        <button mat-button type="button" (click)="reloadCatalogs()">Reintentar</button>
      </div>
    }

    <form class="plan-form" [formGroup]="form" (ngSubmit)="save()">
      <section class="section">
        <div class="context-grid">
          <div>
            <span class="label">Compania</span>
            <strong>{{ workspace.company().name }}</strong>
          </div>
          <div>
            <span class="label">Ejercicio</span>
            <strong>{{ workspace.fiscalYear() }}</strong>
          </div>
          <mat-form-field appearance="outline">
            <mat-label>Descripcion</mat-label>
            <input matInput formControlName="description" maxlength="160" />
          </mat-form-field>
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div>
            <h3>Lineas</h3>
            <p>Cada linea guarda doce meses 1..12. El total anual se calcula desde la grilla mensual.</p>
          </div>
          <button mat-stroked-button type="button" (click)="addLine()" [disabled]="!catalogsReady()">
            <mat-icon>add</mat-icon>
            Agregar linea
          </button>
        </div>

        @if (details.length === 0) {
          <div class="empty-row">Agrega al menos una linea para guardar el Cuadro.</div>
        }

        <div formArrayName="details" class="lines">
          @for (line of details.controls; track $index; let i = $index) {
            <article class="line" [formGroupName]="i">
              <div class="line-head">
                <h4>Linea {{ i + 1 }}</h4>
                <button mat-icon-button type="button" aria-label="Quitar linea" (click)="removeLine(i)" [disabled]="details.length === 1">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>

              <div class="line-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Item</mat-label>
                  <mat-select formControlName="itemCode" (selectionChange)="syncUnitFromItem(i)">
                    @for (item of catalogs().items; track item.code) {
                      <mat-option [value]="item.code">{{ item.code }} - {{ item.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Unidad</mat-label>
                  <input matInput formControlName="unitCode" maxlength="20" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Centro de costo</mat-label>
                  <mat-select formControlName="costCenterId">
                    @for (entry of catalogs().costCenters; track entry.id) {
                      <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Fuente</mat-label>
                  <mat-select formControlName="financingSourceId">
                    @for (entry of catalogs().financingSources; track entry.id) {
                      <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Meta</mat-label>
                  <mat-select formControlName="goalId">
                    @for (entry of catalogs().goals; track entry.id) {
                      <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Clasificador</mat-label>
                  <mat-select formControlName="expenseClassifierId">
                    @for (entry of catalogs().expenseClassifiers; track entry.id) {
                      <mat-option [value]="numericId(entry)">{{ entry.code }} - {{ entry.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="months" formArrayName="monthlyQuantities">
                @for (month of monthControls(i).controls; track $index; let m = $index) {
                  <mat-form-field appearance="outline" [formGroupName]="m">
                    <mat-label>{{ monthLabel(m) }}</mat-label>
                    <input matInput type="number" min="0" step="0.01" formControlName="requestedQuantity" />
                  </mat-form-field>
                }
              </div>

              <div class="line-total">
                <span>Total anual</span>
                <strong>{{ lineTotal(i) | number: '1.2-2' }}</strong>
              </div>
            </article>
          }
        </div>
      </section>

      @if (submitError()) {
        <div class="error-box">{{ submitError() }}</div>
      }

      <div class="sticky-action-bar">
        <button mat-button type="button" (click)="goBack()">Cancelar</button>
        <button mat-flat-button class="btn-primary" type="submit" [disabled]="form.invalid || saving() || !canSave()">
          @if (saving()) {
            <mat-spinner diameter="18" />
          } @else {
            <mat-icon>save</mat-icon>
          }
          {{ isEdit() ? 'Guardar lineas' : 'Crear Cuadro' }}
        </button>
      </div>
    </form>
  `,
  styles: [
    `
      .plan-form { display: grid; gap: 16px; }
      .section {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        padding: 16px;
      }
      .section-head, .line-head, .line-total {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      h3, h4 { margin: 0; }
      p { margin: 4px 0 0; color: var(--color-text-soft); }
      .context-grid, .line-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        align-items: center;
      }
      .label { display: block; color: var(--color-text-soft); font-size: 12px; text-transform: uppercase; }
      .lines { display: grid; gap: 14px; margin-top: 14px; }
      .line {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        padding: 14px;
        background: #fbfafc;
      }
      .months {
        display: grid;
        grid-template-columns: repeat(12, minmax(82px, 1fr));
        gap: 8px;
        overflow-x: auto;
        padding-top: 4px;
      }
      .months mat-form-field { min-width: 82px; }
      .line-total {
        align-items: center;
        margin-top: 8px;
        padding-top: 10px;
        border-top: 1px solid var(--color-border);
        font-variant-numeric: tabular-nums;
      }
      .empty-row { padding: 16px 0; color: var(--color-text-soft); }
      .inline-state, .warning-box, .error-box {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 8px;
        padding: 14px;
      }
      .inline-state { color: var(--color-text-soft); }
      .warning-box { margin-bottom: 16px; background: #fff8eb; color: #8a5a05; }
      .error-box { background: #fde8ec; color: var(--color-danger); }
      @media (max-width: 760px) {
        .section-head { flex-direction: column; }
      }
    `,
  ],
})
export class NeedsPlanFormPlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly needs = inject(NeedsService);
  private readonly platform = inject(PlatformService);
  private readonly notify = inject(NotificationService);
  readonly workspace = inject(WorkspaceContextService);

  private readonly editId = Number(this.route.snapshot.paramMap.get('id'));
  readonly isEdit = signal(Number.isFinite(this.editId) && this.editId > 0);
  readonly loadingPlan = signal(false);
  readonly saving = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly catalogs = signal<CatalogState>({
    loading: false,
    error: null,
    items: [],
    costCenters: [],
    financingSources: [],
    goals: [],
    expenseClassifiers: [],
  });
  readonly catalogsReady = computed(
    () =>
      this.catalogs().items.length > 0 &&
      this.catalogs().costCenters.length > 0 &&
      this.catalogs().financingSources.length > 0 &&
      this.catalogs().goals.length > 0 &&
      this.catalogs().expenseClassifiers.length > 0,
  );

  readonly form: PlanFormGroup = new FormGroup({
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(160)] }),
    details: new FormArray<DetailControlGroup>([], { validators: [Validators.required] }),
  });

  get details(): FormArray<DetailControlGroup> {
    return this.form.controls.details;
  }

  constructor() {
    this.reloadCatalogs();
    if (this.isEdit()) {
      this.loadPlan();
    } else {
      this.addLine();
    }
  }

  reloadCatalogs(): void {
    const companyId = this.workspace.companyId();
    if (!companyId) return;

    this.catalogs.update((state) => ({ ...state, loading: true, error: null }));
    let pending = 5;
    const done = () => {
      pending -= 1;
      if (pending === 0) this.catalogs.update((state) => ({ ...state, loading: false }));
    };
    const fail = (error: unknown) => {
      const apiError = normalizeApiError(error);
      this.catalogs.update((state) => ({ ...state, loading: false, error: apiError.detail }));
    };

    this.platform.listCatalog('items', companyId, this.workspace.fiscalYear()).subscribe({
      next: (items) => this.catalogs.update((state) => ({ ...state, items })),
      error: fail,
      complete: done,
    });
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

  loadPlan(): void {
    this.loadingPlan.set(true);
    this.needs
      .getPlan(this.editId)
      .pipe(finalize(() => this.loadingPlan.set(false)))
      .subscribe({
        next: (plan) => this.patchPlan(plan),
        error: (error: unknown) => this.submitError.set(normalizeApiError(error).detail),
      });
  }

  addLine(line?: NeedsPlanLine): void {
    this.details.push(this.createLineGroup(line));
  }

  removeLine(index: number): void {
    if (this.details.length > 1) {
      this.details.removeAt(index);
    }
  }

  monthControls(index: number): FormArray<MonthControlGroup> {
    return this.details.at(index).controls.monthlyQuantities;
  }

  monthLabel(index: number): string {
    return MONTHS[index] ?? `Mes ${index + 1}`;
  }

  lineTotal(index: number): number {
    return this.monthControls(index).controls.reduce(
      (sum, month) => sum + Number(month.controls.requestedQuantity.value || 0),
      0,
    );
  }

  syncUnitFromItem(index: number): void {
    const line = this.details.at(index);
    const item = this.catalogs().items.find((entry) => entry.code === line.controls.itemCode.value);
    const raw = item?.raw as Record<string, unknown> | undefined;
    const unitCode = String(raw?.['unitCode'] ?? raw?.['unidad'] ?? raw?.['unitMeasure'] ?? '');
    if (unitCode && !line.controls.unitCode.value) {
      line.controls.unitCode.setValue(unitCode);
    }
  }

  numericId(entry: PlatformCatalogEntry): number | null {
    const value = Number(entry.id);
    return Number.isFinite(value) ? value : null;
  }

  canUseContext(): boolean {
    return this.workspace.companyId() !== null;
  }

  canSave(): boolean {
    return this.canUseContext() && this.catalogsReady() && this.details.length > 0;
  }

  save(): void {
    this.submitError.set(null);
    if (this.form.invalid || !this.canSave()) {
      this.form.markAllAsTouched();
      this.submitError.set('Completa las dimensiones, item, unidad y doce cantidades mensuales antes de guardar.');
      return;
    }

    const companyId = this.workspace.companyId();
    if (!companyId) return;

    const request = {
      companyId,
      fiscalYear: this.workspace.fiscalYear(),
      description: this.form.controls.description.value,
      details: this.buildDetailsPayload(),
    };

    this.saving.set(true);
    const call = this.isEdit() ? this.needs.replaceDetails(this.editId, request.details) : this.needs.createPlan(request);

    call.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (plan) => {
        this.notify.success(this.isEdit() ? 'Lineas del Cuadro actualizadas.' : 'Cuadro creado correctamente.');
        this.router.navigate(['/necesidades/planes', plan.id]);
      },
      error: (error: unknown) => {
        const apiError = normalizeApiError(error);
        this.submitError.set(apiError.detail);
        this.notify.error(error);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/necesidades/planes']);
  }

  private patchPlan(plan: NeedsPlan): void {
    this.form.controls.description.setValue(plan.description ?? '');
    this.details.clear();
    for (const line of plan.details) {
      this.addLine(line);
    }
    if (this.details.length === 0) this.addLine();
  }

  private createLineGroup(line?: NeedsPlanLine): DetailControlGroup {
    return new FormGroup({
      itemCode: new FormControl(line?.itemCode ?? '', { nonNullable: true, validators: [Validators.required] }),
      unitCode: new FormControl(line?.unitCode ?? '', { nonNullable: true, validators: [Validators.required] }),
      costCenterId: new FormControl(line?.costCenterId ?? null, { validators: [Validators.required] }),
      financingSourceId: new FormControl(line?.financingSourceId ?? null, { validators: [Validators.required] }),
      goalId: new FormControl(line?.goalId ?? null, { validators: [Validators.required] }),
      expenseClassifierId: new FormControl(line?.expenseClassifierId ?? null, { validators: [Validators.required] }),
      monthlyQuantities: new FormArray<MonthControlGroup>(
        Array.from({ length: 12 }, (_, index) => this.createMonthGroup(index + 1, line)),
      ),
    });
  }

  private createMonthGroup(month: number, line?: NeedsPlanLine): MonthControlGroup {
    const existing = line?.months?.find((item) => item.month === month);
    return new FormGroup({
      month: new FormControl(month, { nonNullable: true }),
      requestedQuantity: new FormControl(existing?.requestedQuantity ?? 0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0)],
      }),
    });
  }

  private buildDetailsPayload(): NeedsPlanDetailRequest[] {
    return this.details.controls.map((line) => ({
      itemCode: line.controls.itemCode.value,
      unitCode: line.controls.unitCode.value,
      costCenterId: requiredNumber(line.controls.costCenterId.value),
      financingSourceId: requiredNumber(line.controls.financingSourceId.value),
      goalId: requiredNumber(line.controls.goalId.value),
      expenseClassifierId: requiredNumber(line.controls.expenseClassifierId.value),
      monthlyQuantities: line.controls.monthlyQuantities.controls.map(
        (month): NeedsPlanMonthlyQuantityRequest => ({
          month: month.controls.month.value,
          requestedQuantity: Number(month.controls.requestedQuantity.value || 0),
        }),
      ),
    }));
  }
}

function requiredNumber(value: number | null): number {
  if (value === null) throw new Error('Valor numerico requerido.');
  return value;
}
