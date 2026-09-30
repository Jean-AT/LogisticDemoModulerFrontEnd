import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { finalize } from 'rxjs';
import { normalizeApiError } from '../../core/api-error';
import { emptyState, errorState, LoadState, loadingState, successState } from '../../core/load-state';
import { NotificationService } from '../../core/notification.service';
import { CompanyContext, WorkspaceContextService } from '../../core/workspace-context.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { PlatformCatalogEntry, PlatformCatalogKind, PlatformFiscalPeriod, PlatformUserAccess } from './platform.models';
import { PlatformService } from './platform.service';

interface CatalogSection {
  key: PlatformCatalogKind;
  title: string;
  subtitle: string;
  state: LoadState<PlatformCatalogEntry[]>;
}

const CATALOG_SECTIONS: Omit<CatalogSection, 'state'>[] = [
  { key: 'costCenters', title: 'Centros de costo', subtitle: 'Selector de Cuadro y disponibilidad.' },
  { key: 'financingSources', title: 'Fuentes de financiamiento', subtitle: 'Dimension presupuestal.' },
  { key: 'goals', title: 'Metas', subtitle: 'Filtradas por ejercicio fiscal.' },
  { key: 'expenseClassifiers', title: 'Clasificadores de gasto', subtitle: 'Clasificador usado en Cuadro y presupuesto.' },
  { key: 'items', title: 'Items corporativos', subtitle: 'Catalogo de bienes y servicios de Plataforma.' },
];

@Component({
  selector: 'app-platform-page',
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
      title="Plataforma"
      subtitle="Catalogos, acceso, periodos y numeracion versionada para el flujo V2."
    >
      <button actions mat-stroked-button type="button" (click)="refreshAll()">
        <mat-icon>refresh</mat-icon>
        Actualizar
      </button>
    </app-page-header>

    <mat-tab-group animationDuration="160ms">
      <mat-tab label="Catalogos">
        <section class="tab-panel">
          <div class="notice">
            <mat-icon>info</mat-icon>
            <span>Los catalogos se leen desde <strong>/api/v1/platform/catalog</strong> y actualizan el selector global de compania.</span>
          </div>

          <article class="section">
            <div class="section-head">
              <div>
                <h3>Companias</h3>
                <p>Fuente del contexto global de trabajo.</p>
              </div>
              <button mat-stroked-button type="button" (click)="loadCompanies()">
                <mat-icon>sync</mat-icon>
                Recargar
              </button>
            </div>
            @switch (companiesState().status) {
              @case ('loading') {
                <div class="inline-state"><mat-spinner diameter="22" /> Cargando companias...</div>
              }
              @case ('error') {
                <div class="error-box">
                  {{ companiesState().error?.detail }}
                  <button mat-button type="button" (click)="loadCompanies()">Reintentar</button>
                </div>
              }
              @case ('empty') {
                <div class="empty-row">No se encontraron companias.</div>
              }
              @default {
                <div class="responsive-table">
                  <table>
                    <thead>
                      <tr><th>Codigo</th><th>Nombre</th><th>ID</th></tr>
                    </thead>
                    <tbody>
                      @for (company of companies(); track company.code) {
                        <tr>
                          <td>{{ company.code || '-' }}</td>
                          <td>{{ company.name }}</td>
                          <td>{{ company.id ?? '-' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          </article>

          @if (!workspace.companyId()) {
            <div class="warning-box">
              <mat-icon>priority_high</mat-icon>
              Selecciona una compania con ID valido para consultar catalogos dependientes.
            </div>
          }

          <div class="catalog-grid">
            @for (section of catalogSections(); track section.key) {
              <article class="section">
                <div class="section-head compact">
                  <div>
                    <h3>{{ section.title }}</h3>
                    <p>{{ section.subtitle }}</p>
                  </div>
                </div>
                @switch (section.state.status) {
                  @case ('loading') {
                    <div class="inline-state"><mat-spinner diameter="22" /> Cargando...</div>
                  }
                  @case ('error') {
                    <div class="error-box">{{ section.state.error.detail }}</div>
                  }
                  @case ('empty') {
                    <div class="empty-row">Sin registros para el contexto actual.</div>
                  }
                  @case ('success') {
                    <ul class="entry-list">
                      @for (entry of section.state.data.slice(0, 8); track entry.code + '-' + entry.id) {
                        <li>
                          <span class="entry-code">{{ entry.code || entry.id || '-' }}</span>
                          <span>{{ entry.name }}</span>
                        </li>
                      }
                    </ul>
                    @if (section.state.data.length > 8) {
                      <p class="hint">Mostrando 8 de {{ section.state.data.length }} registros.</p>
                    }
                  }
                  @default {
                    <div class="empty-row">Pendiente de consulta.</div>
                  }
                }
              </article>
            }
          </div>
        </section>
      </mat-tab>

      <mat-tab label="Accesos">
        <section class="tab-panel two-column">
          <article class="section">
            <h3>Inspeccion de perfil</h3>
            <p class="muted">Contrato disponible: GET /platform/security/users/&lbrace;username&rbrace;/access.</p>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Usuario</mat-label>
                <input matInput [formControl]="usernameControl" autocomplete="off" />
              </mat-form-field>
              <button mat-flat-button class="btn-primary" type="button" [disabled]="usernameControl.invalid || loadingAccess()" (click)="searchAccess()">
                <mat-icon>manage_accounts</mat-icon>
                Consultar
              </button>
            </div>
            @if (loadingAccess()) {
              <div class="inline-state"><mat-spinner diameter="22" /> Consultando acceso...</div>
            }
            @if (accessState().status === 'error') {
              <div class="error-box">{{ accessState().error?.detail }}</div>
            }
            @if (accessState().status === 'success') {
              <pre class="json-box">{{ json(accessState().data?.raw) }}</pre>
            }
          </article>

          <article class="section muted-section">
            <h3>Brecha BE-FE03</h3>
            <p>
              La API actual no lista usuarios ni roles, y tampoco permite asignar o revocar roles desde UI.
              Esta pantalla deja visible el diagnostico hasta que existan endpoints auditados.
            </p>
          </article>
        </section>
      </mat-tab>

      <mat-tab label="Periodos">
        <section class="tab-panel two-column">
          <article class="section">
            <h3>Periodo fiscal</h3>
            <p class="muted">Consulta y transiciones puntuales del periodo seleccionado.</p>
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Mes</mat-label>
                <mat-select [formControl]="monthControl">
                  @for (month of months; track month.value) {
                    <mat-option [value]="month.value">{{ month.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button type="button" [disabled]="!canUseCompany()" (click)="loadFiscalPeriod()">Consultar</button>
            </div>
            @switch (periodState().status) {
              @case ('loading') {
                <div class="inline-state"><mat-spinner diameter="22" /> Cargando periodo...</div>
              }
              @case ('error') {
                <div class="error-box">{{ periodState().error?.detail }}</div>
              }
              @case ('success') {
                <div class="period-card">
                  <span class="badge">{{ periodStatus() }}</span>
                  <pre class="json-box">{{ json(periodState().data?.raw) }}</pre>
                </div>
                <div class="action-row">
                  <button mat-flat-button class="btn-primary" type="button" (click)="changePeriod('open')">
                    <mat-icon>lock_open</mat-icon>
                    Abrir
                  </button>
                  <button mat-flat-button class="btn-danger" type="button" (click)="changePeriod('close')">
                    <mat-icon>lock</mat-icon>
                    Cerrar
                  </button>
                </div>
              }
              @default {
                <div class="empty-row">Consulta un periodo para ver su estado.</div>
              }
            }
          </article>

          <article class="section muted-section">
            <h3>Brecha BE-FE04</h3>
            <p>
              No existe lista/calendario de periodos. Por ahora la UI consulta un mes puntual y ejecuta abrir/cerrar
              solo bajo accion explicita.
            </p>
          </article>
        </section>
      </mat-tab>

      <mat-tab label="Secuencias">
        <section class="tab-panel two-column">
          <article class="section">
            <h3>Configuracion documental</h3>
            <form class="sequence-form" [formGroup]="sequenceForm" (ngSubmit)="saveSequence()">
              <mat-form-field appearance="outline">
                <mat-label>Tipo de documento</mat-label>
                <input matInput formControlName="documentType" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Prefijo</mat-label>
                <input matInput formControlName="prefix" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Siguiente valor</mat-label>
                <input matInput type="number" formControlName="nextValue" />
              </mat-form-field>
              <div class="action-row">
                <button mat-flat-button class="btn-primary" type="submit" [disabled]="sequenceForm.invalid || savingSequence()">
                  <mat-icon>save</mat-icon>
                  Guardar
                </button>
                <button mat-stroked-button type="button" [disabled]="sequenceForm.controls.documentType.invalid" (click)="nextSequence()">
                  <mat-icon>confirmation_number</mat-icon>
                  Emitir siguiente
                </button>
              </div>
            </form>
            @if (sequenceResult()) {
              <pre class="json-box">{{ json(sequenceResult()) }}</pre>
            }
          </article>

          <article class="section warning-section">
            <h3>Atencion</h3>
            <p>
              POST /platform/document-sequences/next consume un numero real. La accion esta separada de guardar y pide
              confirmacion antes de ejecutarse.
            </p>
          </article>
        </section>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [
    `
      .tab-panel { padding: 20px 0 8px; display: grid; gap: 16px; }
      .two-column { grid-template-columns: minmax(0, 1fr) minmax(280px, 360px); align-items: start; }
      .section {
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        padding: 16px;
      }
      .section-head { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 12px; }
      .section-head.compact { margin-bottom: 8px; }
      h3 { margin: 0; font-size: 16px; }
      p { margin: 6px 0 0; color: var(--color-text-soft); line-height: 1.45; }
      .notice, .warning-box, .error-box, .inline-state {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 8px;
        padding: 12px;
      }
      .notice { background: var(--color-primary-soft); color: var(--color-primary-strong); }
      .warning-box, .warning-section { border-color: #f2d39a; background: #fff8eb; }
      .error-box { justify-content: space-between; background: #fde8ec; color: var(--color-danger); }
      .inline-state { color: var(--color-text-soft); }
      .empty-row { padding: 16px 0; color: var(--color-text-soft); }
      .catalog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
      .responsive-table { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; min-width: 520px; }
      th, td { padding: 10px 8px; border-bottom: 1px solid var(--color-border); text-align: left; }
      th { color: var(--color-text-soft); font-size: 12px; text-transform: uppercase; }
      .entry-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
      .entry-list li { display: flex; gap: 10px; align-items: baseline; }
      .entry-code {
        min-width: 84px;
        color: var(--color-primary-strong);
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .hint, .muted { color: var(--color-text-soft); font-size: 13px; }
      .muted-section { background: #fbfafc; }
      .form-row, .action-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .form-row mat-form-field { flex: 1 1 220px; }
      .sequence-form { display: grid; gap: 10px; }
      .json-box {
        max-height: 300px;
        overflow: auto;
        padding: 12px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: #fbfafc;
        color: var(--color-text);
        white-space: pre-wrap;
      }
      .badge {
        display: inline-flex;
        margin-bottom: 10px;
        padding: 4px 8px;
        border-radius: 999px;
        background: var(--color-primary-soft);
        color: var(--color-primary-strong);
        font-weight: 700;
      }
      @media (max-width: 900px) {
        .two-column { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class PlatformPageComponent {
  private readonly platform = inject(PlatformService);
  private readonly notify = inject(NotificationService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
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

  readonly companiesState = signal<LoadState<CompanyContext[]>>(loadingState());
  readonly catalogSections = signal<CatalogSection[]>(
    CATALOG_SECTIONS.map((section) => ({ ...section, state: loadingState<PlatformCatalogEntry[]>() })),
  );
  readonly accessState = signal<LoadState<PlatformUserAccess>>(emptyState());
  readonly periodState = signal<LoadState<PlatformFiscalPeriod>>(emptyState());
  readonly loadingAccess = signal(false);
  readonly savingSequence = signal(false);
  readonly sequenceResult = signal<unknown | null>(null);

  readonly companies = computed(() => this.companiesState().data ?? []);
  readonly usernameControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly monthControl = new FormControl(new Date().getMonth() + 1, { nonNullable: true });
  readonly sequenceForm = new FormGroup({
    documentType: new FormControl('OC', { nonNullable: true, validators: [Validators.required] }),
    prefix: new FormControl('OC', { nonNullable: true, validators: [Validators.required] }),
    nextValue: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
  });

  constructor() {
    this.loadCompanies();
  }

  refreshAll(): void {
    this.loadCompanies();
    this.loadCatalogs();
    if (this.canUseCompany()) {
      this.loadFiscalPeriod();
    }
  }

  loadCompanies(): void {
    this.companiesState.set(loadingState(this.companiesState().data));
    this.platform.listCompanies().subscribe({
      next: (companies) => {
        this.companiesState.set(companies.length > 0 ? successState(companies) : emptyState([]));
        this.workspace.setCompanies(companies);
        this.loadCatalogs();
      },
      error: (error: unknown) => this.companiesState.set(errorState(normalizeApiError(error), this.companies())),
    });
  }

  loadCatalogs(): void {
    const companyId = this.workspace.companyId();
    const fiscalYear = this.workspace.fiscalYear();
    if (!companyId) {
      this.catalogSections.set(
        CATALOG_SECTIONS.map((section) => ({ ...section, state: emptyState<PlatformCatalogEntry[]>([]) })),
      );
      return;
    }

    this.catalogSections.set(CATALOG_SECTIONS.map((section) => ({ ...section, state: loadingState<PlatformCatalogEntry[]>() })));
    for (const section of CATALOG_SECTIONS) {
      this.platform.listCatalog(section.key, companyId, fiscalYear).subscribe({
        next: (items) => this.patchCatalogSection(section.key, items.length > 0 ? successState(items) : emptyState([])),
        error: (error: unknown) => this.patchCatalogSection(section.key, errorState(normalizeApiError(error))),
      });
    }
  }

  searchAccess(): void {
    const username = this.usernameControl.value.trim();
    if (!username) return;

    this.loadingAccess.set(true);
    this.accessState.set(loadingState(this.accessState().data));
    this.platform
      .getUserAccess(username)
      .pipe(finalize(() => this.loadingAccess.set(false)))
      .subscribe({
        next: (access) => this.accessState.set(successState(access)),
        error: (error: unknown) => this.accessState.set(errorState(normalizeApiError(error))),
      });
  }

  loadFiscalPeriod(): void {
    const companyId = this.workspace.companyId();
    if (!companyId) return;

    this.periodState.set(loadingState(this.periodState().data));
    this.platform.getFiscalPeriod(companyId, this.workspace.fiscalYear(), this.monthControl.value).subscribe({
      next: (period) => this.periodState.set(successState(period)),
      error: (error: unknown) => this.periodState.set(errorState(normalizeApiError(error))),
    });
  }

  changePeriod(action: 'open' | 'close'): void {
    const companyId = this.workspace.companyId();
    if (!companyId) return;

    const verb = action === 'open' ? 'Abrir' : 'Cerrar';
    this.confirmDialog
      .confirm({
        title: `${verb} periodo`,
        message: `${verb} ${this.periodLabel()} para la compania seleccionada. El backend auditara esta operacion.`,
        confirmText: verb,
        danger: action === 'close',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.periodState.set(loadingState(this.periodState().data));
        const request =
          action === 'open'
            ? this.platform.openFiscalPeriod(companyId, this.workspace.fiscalYear(), this.monthControl.value)
            : this.platform.closeFiscalPeriod(companyId, this.workspace.fiscalYear(), this.monthControl.value);
        request.subscribe({
          next: (period) => {
            this.periodState.set(successState(period));
            this.notify.success(`Periodo ${action === 'open' ? 'abierto' : 'cerrado'} correctamente.`);
          },
          error: (error: unknown) => this.periodState.set(errorState(normalizeApiError(error), this.periodState().data)),
        });
      });
  }

  saveSequence(): void {
    const companyId = this.workspace.companyId();
    if (!companyId || this.sequenceForm.invalid) return;

    this.savingSequence.set(true);
    this.platform
      .saveDocumentSequence({
        companyId,
        fiscalYear: this.workspace.fiscalYear(),
        documentType: this.sequenceForm.controls.documentType.value,
        prefix: this.sequenceForm.controls.prefix.value,
        nextValue: this.sequenceForm.controls.nextValue.value,
      })
      .pipe(finalize(() => this.savingSequence.set(false)))
      .subscribe({
        next: (result) => {
          this.sequenceResult.set(result);
          this.notify.success('Secuencia guardada correctamente.');
        },
        error: (error: unknown) => this.notify.error(error),
      });
  }

  nextSequence(): void {
    const companyId = this.workspace.companyId();
    if (!companyId || this.sequenceForm.controls.documentType.invalid) return;

    this.confirmDialog
      .confirm({
        title: 'Emitir siguiente numero',
        message: 'Esta accion consume un numero documental real. Ejecutala solo si necesitas reservarlo ahora.',
        confirmText: 'Emitir',
        danger: true,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.platform
          .nextDocumentSequence({
            companyId,
            fiscalYear: this.workspace.fiscalYear(),
            documentType: this.sequenceForm.controls.documentType.value,
          })
          .subscribe({
            next: (result) => {
              this.sequenceResult.set(result);
              this.notify.success('Numero emitido correctamente.');
            },
            error: (error: unknown) => this.notify.error(error),
          });
      });
  }

  canUseCompany(): boolean {
    return this.workspace.companyId() !== null;
  }

  periodStatus(): string {
    const period = this.periodState().data;
    if (!period) return 'Sin estado';
    if (period.status) return period.status;
    if (period.open !== undefined) return period.open ? 'ABIERTO' : 'CERRADO';
    return 'Estado no informado';
  }

  periodLabel(): string {
    const month = this.months.find((item) => item.value === this.monthControl.value)?.label ?? `Mes ${this.monthControl.value}`;
    return `${month} ${this.workspace.fiscalYear()}`;
  }

  json(value: unknown): string {
    return JSON.stringify(value ?? {}, null, 2);
  }

  private patchCatalogSection(key: PlatformCatalogKind, state: LoadState<PlatformCatalogEntry[]>): void {
    this.catalogSections.update((sections) =>
      sections.map((section) => (section.key === key ? { ...section, state } : section)),
    );
  }
}
