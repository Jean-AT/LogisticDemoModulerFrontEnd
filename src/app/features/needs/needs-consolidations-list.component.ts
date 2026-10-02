import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { normalizeApiError } from '../../core/api-error';
import { emptyState, errorState, LoadState, loadingState, successState } from '../../core/load-state';
import { NotificationService } from '../../core/notification.service';
import { PageResponse } from '../../core/models';
import { formatDate } from '../../core/utils';
import { WorkspaceContextService } from '../../core/workspace-context.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { NeedsConsolidation } from './needs.models';
import { NeedsService } from './needs.service';

@Component({
  selector: 'app-needs-consolidations-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTableModule,
    EmptyStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      title="Consolidaciones"
      subtitle="Agrupa Cuadros revisados por compania y ejercicio antes de transferirlos a presupuesto."
    >
      <button actions mat-stroked-button type="button" (click)="reload()">
        <mat-icon>refresh</mat-icon>
        Actualizar
      </button>
      <button actions mat-flat-button class="btn-primary" type="button" [disabled]="!workspace.companyId() || creating()" (click)="create()">
        <mat-icon>merge_type</mat-icon>
        Consolidar revisados
      </button>
    </app-page-header>

    @if (!workspace.companyId()) {
      <div class="warning-box">
        <mat-icon>priority_high</mat-icon>
        Selecciona una compania con ID valido para consultar consolidaciones.
      </div>
    }

    @switch (state().status) {
      @case ('loading') {
        <div class="inline-state"><mat-spinner diameter="24" /> Cargando consolidaciones...</div>
      }
      @case ('error') {
        <div class="error-box">
          <span>{{ state().error?.detail }}</span>
          <button mat-button type="button" (click)="reload()">Reintentar</button>
        </div>
      }
      @case ('empty') {
        <app-empty-state
          title="Sin consolidaciones"
          subtitle="No hay consolidaciones para el contexto seleccionado."
          icon="merge_type"
        />
      }
      @case ('success') {
        <div class="table-wrap">
          <table mat-table [dataSource]="state().data?.content ?? []">
            <ng-container matColumnDef="number">
              <th mat-header-cell *matHeaderCellDef>Numero</th>
              <td mat-cell *matCellDef="let row">{{ row.number || row.id }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row"><app-status-chip [estado]="row.status || 'SIN_ESTADO'" /></td>
            </ng-container>
            <ng-container matColumnDef="sources">
              <th mat-header-cell *matHeaderCellDef>Fuentes</th>
              <td mat-cell *matCellDef="let row">{{ row.sources.length }}</td>
            </ng-container>
            <ng-container matColumnDef="lines">
              <th mat-header-cell *matHeaderCellDef>Lineas</th>
              <td mat-cell *matCellDef="let row">{{ row.lines.length }}</td>
            </ng-container>
            <ng-container matColumnDef="updated">
              <th mat-header-cell *matHeaderCellDef>Actualizado</th>
              <td mat-cell *matCellDef="let row">{{ date(row.updatedAt || row.createdAt) }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" aria-label="Ver consolidacion" (click)="open(row.id)">
                  <mat-icon>open_in_new</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </div>

        <mat-paginator
          [length]="state().data?.totalElements ?? 0"
          [pageIndex]="state().data?.page ?? 0"
          [pageSize]="state().data?.size ?? pageSize"
          [pageSizeOptions]="[10, 25, 50]"
          (page)="pageChanged($event)"
        />
      }
    }
  `,
  styles: [
    `
      .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
      }
      table { width: 100%; min-width: 760px; }
      .inline-state, .warning-box, .error-box {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 8px;
        padding: 14px;
      }
      .inline-state { color: var(--color-text-soft); }
      .warning-box { margin-bottom: 16px; background: #fff8eb; color: #8a5a05; }
      .error-box { justify-content: space-between; background: #fde8ec; color: var(--color-danger); }
    `,
  ],
})
export class NeedsConsolidationsListComponent {
  private readonly needs = inject(NeedsService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  readonly workspace = inject(WorkspaceContextService);

  readonly columns = ['number', 'status', 'sources', 'lines', 'updated', 'actions'];
  readonly state = signal<LoadState<PageResponse<NeedsConsolidation>>>(loadingState());
  readonly creating = signal(false);
  readonly pageSize = 10;

  constructor() {
    this.load(0, this.pageSize);
  }

  reload(): void {
    this.load(this.state().data?.page ?? 0, this.state().data?.size ?? this.pageSize);
  }

  pageChanged(event: PageEvent): void {
    this.load(event.pageIndex, event.pageSize);
  }

  create(): void {
    const companyId = this.workspace.companyId();
    if (!companyId) return;

    this.confirm
      .confirm({
        title: 'Consolidar Cuadros',
        message: 'Se consolidaran los Cuadros revisados del contexto actual. El backend validara ventanas y estados.',
        confirmText: 'Consolidar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.creating.set(true);
        this.needs.createConsolidation(companyId, this.workspace.fiscalYear()).subscribe({
          next: (consolidation) => {
            this.creating.set(false);
            this.notify.success('Consolidacion creada correctamente.');
            this.router.navigate(['/necesidades/consolidaciones', consolidation.id]);
          },
          error: (error: unknown) => {
            this.creating.set(false);
            this.notify.error(error);
          },
        });
      });
  }

  open(id: number): void {
    this.router.navigate(['/necesidades/consolidaciones', id]);
  }

  date(value: string | undefined): string {
    return formatDate(value);
  }

  private load(page: number, size: number): void {
    const companyId = this.workspace.companyId();
    if (!companyId) {
      this.state.set(emptyState({ content: [], page, size, totalElements: 0, totalPages: 0 }));
      return;
    }

    this.state.set(loadingState(this.state().data));
    this.needs
      .listConsolidations({ companyId, fiscalYear: this.workspace.fiscalYear(), page, size })
      .subscribe({
        next: (result) => this.state.set(result.content.length > 0 ? successState(result) : emptyState(result)),
        error: (error: unknown) => this.state.set(errorState(normalizeApiError(error), this.state().data)),
      });
  }
}
