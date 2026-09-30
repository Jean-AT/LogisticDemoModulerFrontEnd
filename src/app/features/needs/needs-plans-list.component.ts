import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { normalizeApiError } from '../../core/api-error';
import { emptyState, errorState, LoadState, loadingState, successState } from '../../core/load-state';
import { PageResponse } from '../../core/models';
import { formatDate } from '../../core/utils';
import { WorkspaceContextService } from '../../core/workspace-context.service';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { NeedsPlan } from './needs.models';
import { NeedsService } from './needs.service';

@Component({
  selector: 'app-needs-plans-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    EmptyStateComponent,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      title="Cuadro de necesidades"
      subtitle="Bandeja versionada de planes por compania y ejercicio."
    >
      <button actions mat-stroked-button type="button" (click)="reload()">
        <mat-icon>refresh</mat-icon>
        Actualizar
      </button>
      <button actions mat-flat-button class="btn-primary" type="button" (click)="newPlan()">
        <mat-icon>add</mat-icon>
        Nuevo
      </button>
    </app-page-header>

    <section class="filters" aria-label="Filtros de Cuadro">
      <mat-form-field appearance="outline">
        <mat-label>Estado</mat-label>
        <mat-select [formControl]="statusControl">
          <mat-option value="">Todos</mat-option>
          @for (status of statuses; track status) {
            <mat-option [value]="status">{{ status }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <button mat-stroked-button type="button" (click)="search()">
        <mat-icon>search</mat-icon>
        Buscar
      </button>
    </section>

    @if (!workspace.companyId()) {
      <div class="warning-box">
        <mat-icon>priority_high</mat-icon>
        Selecciona una compania con ID valido desde Plataforma para consultar Cuadros.
      </div>
    }

    @switch (state().status) {
      @case ('loading') {
        <div class="inline-state"><mat-spinner diameter="24" /> Cargando Cuadros...</div>
      }
      @case ('error') {
        <div class="error-box">
          <span>{{ state().error?.detail }}</span>
          <button mat-button type="button" (click)="reload()">Reintentar</button>
        </div>
      }
      @case ('empty') {
        <app-empty-state
          title="Sin Cuadros"
          subtitle="No hay planes para los filtros y contexto seleccionados."
          icon="view_timeline"
        />
      }
      @case ('success') {
        <div class="table-wrap">
          <table mat-table [dataSource]="state().data?.content ?? []">
            <ng-container matColumnDef="number">
              <th mat-header-cell *matHeaderCellDef>Numero</th>
              <td mat-cell *matCellDef="let row">{{ row.number || row.id }}</td>
            </ng-container>
            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Descripcion</th>
              <td mat-cell *matCellDef="let row">{{ row.description || '-' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let row"><app-status-chip [estado]="row.status" /></td>
            </ng-container>
            <ng-container matColumnDef="lines">
              <th mat-header-cell *matHeaderCellDef>Lineas</th>
              <td mat-cell *matCellDef="let row">{{ row.details.length }}</td>
            </ng-container>
            <ng-container matColumnDef="updated">
              <th mat-header-cell *matHeaderCellDef>Actualizado</th>
              <td mat-cell *matCellDef="let row">{{ date(row.updatedAt || row.createdAt) }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" aria-label="Ver Cuadro" (click)="open(row.id)">
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
      .filters {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        padding: 14px 0 16px;
      }
      .filters mat-form-field { width: 220px; }
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
      @media (max-width: 640px) {
        .filters mat-form-field, .filters button { width: 100%; }
      }
    `,
  ],
})
export class NeedsPlansListComponent {
  private readonly needs = inject(NeedsService);
  private readonly router = inject(Router);
  readonly workspace = inject(WorkspaceContextService);

  readonly columns = ['number', 'description', 'status', 'lines', 'updated', 'actions'];
  readonly statuses = ['DRAFT', 'SUBMITTED', 'REVIEWED', 'OBSERVED', 'REJECTED', 'TRANSFERRED'];
  readonly statusControl = new FormControl('', { nonNullable: true });
  readonly state = signal<LoadState<PageResponse<NeedsPlan>>>(loadingState());
  readonly pageSize = 10;

  constructor() {
    this.load(0, this.pageSize);
  }

  search(): void {
    this.load(0, this.state().data?.size ?? this.pageSize);
  }

  reload(): void {
    this.load(this.state().data?.page ?? 0, this.state().data?.size ?? this.pageSize);
  }

  pageChanged(event: PageEvent): void {
    this.load(event.pageIndex, event.pageSize);
  }

  open(id: number): void {
    this.router.navigate(['/necesidades/planes', id]);
  }

  newPlan(): void {
    this.router.navigate(['/necesidades/planes/nuevo']);
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
      .listPlans({
        companyId,
        fiscalYear: this.workspace.fiscalYear(),
        status: this.statusControl.value || undefined,
        page,
        size,
      })
      .subscribe({
        next: (result) => this.state.set(result.content.length > 0 ? successState(result) : emptyState(result)),
        error: (error: unknown) => this.state.set(errorState(normalizeApiError(error), this.state().data)),
      });
  }
}
