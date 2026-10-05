import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { normalizeApiError } from '../../core/api-error';
import { IdempotencyService } from '../../core/idempotency.service';
import { errorState, LoadState, loadingState, successState } from '../../core/load-state';
import { NotificationService } from '../../core/notification.service';
import { formatAmount, formatDate } from '../../core/utils';
import { WorkspaceContextService } from '../../core/workspace-context.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { NeedsBalance, NeedsConsolidation, NeedsConsolidationLine } from './needs.models';
import { NeedsService } from './needs.service';

@Component({
  selector: 'app-needs-consolidation-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    PageHeaderComponent,
    StatusChipComponent,
  ],
  template: `
    <app-page-header
      [title]="title()"
      subtitle="Detalle de consolidacion, fuentes, lineas, saldo y transferencia a presupuesto."
    >
      <button actions mat-stroked-button type="button" (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Volver
      </button>
      <button actions mat-stroked-button type="button" (click)="reload()">
        <mat-icon>refresh</mat-icon>
        Actualizar
      </button>
    </app-page-header>

    @switch (state().status) {
      @case ('loading') {
        <div class="inline-state"><mat-spinner diameter="24" /> Cargando consolidacion...</div>
      }
      @case ('error') {
        <div class="error-box">
          <span>{{ state().error?.detail }}</span>
          <button mat-button type="button" (click)="reload()">Reintentar</button>
        </div>
      }
      @case ('success') {
        @let consolidation = currentConsolidation();
        <section class="summary">
          <div>
            <span class="label">Estado</span>
            <app-status-chip [estado]="consolidation.status || 'SIN_ESTADO'" />
          </div>
          <div>
            <span class="label">Compania</span>
            <strong>{{ consolidation.companyId ?? '-' }}</strong>
          </div>
          <div>
            <span class="label">Ejercicio</span>
            <strong>{{ consolidation.fiscalYear ?? '-' }}</strong>
          </div>
          <div>
            <span class="label">Actualizado</span>
            <strong>{{ date(consolidation.updatedAt || consolidation.createdAt) }}</strong>
          </div>
        </section>

        <section class="actions">
          <button mat-flat-button class="btn-primary" type="button" [disabled]="transferring()" (click)="transfer(consolidation)">
            <mat-icon>sync_alt</mat-icon>
            Transferir
          </button>
          <button mat-flat-button class="btn-danger" type="button" [disabled]="reversing()" (click)="reverse(consolidation)">
            <mat-icon>undo</mat-icon>
            Revertir
          </button>
        </section>

        @if (transferKey()) {
          <div class="notice">
            <mat-icon>vpn_key</mat-icon>
            Transferencia en intento logico con Idempotency-Key: <strong>{{ transferKey() }}</strong>
          </div>
        }

        <section class="section">
          <h3>Fuentes</h3>
          @if (consolidation.sources.length === 0) {
            <p class="muted">La respuesta no incluyo Cuadros fuente.</p>
          } @else {
            <ul class="source-list">
              @for (source of consolidation.sources; track source.planId || source.planNumber) {
                <li>
                  <span>{{ source.planNumber || source.planId || '-' }}</span>
                  <app-status-chip [estado]="source.status || 'SIN_ESTADO'" />
                </li>
              }
            </ul>
          }
        </section>

        <section class="section">
          <h3>Lineas consolidadas</h3>
          <div class="table-wrap">
            <table mat-table [dataSource]="consolidation.lines">
              <ng-container matColumnDef="item">
                <th mat-header-cell *matHeaderCellDef>Item</th>
                <td mat-cell *matCellDef="let row">{{ itemLabel(row) }}</td>
              </ng-container>
              <ng-container matColumnDef="dimensions">
                <th mat-header-cell *matHeaderCellDef>Dimensiones</th>
                <td mat-cell *matCellDef="let row">{{ dimensionLabel(row) }}</td>
              </ng-container>
              <ng-container matColumnDef="quantity">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let row">{{ amount(lineTotal(row)) }}</td>
              </ng-container>
              <ng-container matColumnDef="balance">
                <th mat-header-cell *matHeaderCellDef>Saldo</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.id && balances()[row.id]) {
                    {{ amount(balanceValue(balances()[row.id])) }}
                  } @else if (row.id) {
                    <button mat-button type="button" (click)="loadBalance(row.id)">Ver saldo</button>
                  } @else {
                    -
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Acciones</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-stroked-button type="button" [disabled]="!row.id" (click)="createRequirement(row)">
                    <mat-icon>post_add</mat-icon>
                    Requerimiento
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
        </section>

        <section class="section">
          <h3>Respuesta cruda</h3>
          <pre>{{ json(consolidation.raw) }}</pre>
        </section>
      }
    }
  `,
  styles: [
    `
      .inline-state, .notice, .error-box {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 8px;
        padding: 14px;
      }
      .inline-state { color: var(--color-text-soft); }
      .notice { margin-top: 16px; background: var(--color-primary-soft); color: var(--color-primary-strong); }
      .error-box { justify-content: space-between; background: #fde8ec; color: var(--color-danger); }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        padding: 16px;
      }
      .label { display: block; margin-bottom: 5px; color: var(--color-text-soft); font-size: 12px; text-transform: uppercase; }
      .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
      .section {
        margin-top: 16px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        padding: 16px;
      }
      h3 { margin: 0 0 12px; font-size: 16px; }
      .muted { color: var(--color-text-soft); }
      .source-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
      .source-list li { display: flex; align-items: center; gap: 10px; }
      .table-wrap { overflow-x: auto; }
      table { width: 100%; min-width: 820px; }
      pre {
        max-height: 320px;
        overflow: auto;
        margin: 0;
        padding: 12px;
        border-radius: 8px;
        background: #fbfafc;
        white-space: pre-wrap;
      }
    `,
  ],
})
export class NeedsConsolidationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly needs = inject(NeedsService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  private readonly idempotency = inject(IdempotencyService);
  readonly workspace = inject(WorkspaceContextService);

  private readonly id = Number(this.route.snapshot.paramMap.get('id'));
  readonly columns = ['item', 'dimensions', 'quantity', 'balance', 'actions'];
  readonly state = signal<LoadState<NeedsConsolidation>>(loadingState());
  readonly balances = signal<Record<number, NeedsBalance>>({});
  readonly transferring = signal(false);
  readonly reversing = signal(false);
  readonly transferKey = signal<string | null>(null);

  constructor() {
    this.reload();
  }

  title(): string {
    const consolidation = this.state().data;
    return consolidation?.number ? `Consolidacion ${consolidation.number}` : `Consolidacion ${this.id}`;
  }

  currentConsolidation(): NeedsConsolidation {
    const consolidation = this.state().data;
    if (!consolidation) throw new Error('No hay consolidacion cargada.');
    return consolidation;
  }

  reload(): void {
    this.state.set(loadingState(this.state().data));
    this.needs.getConsolidation(this.id).subscribe({
      next: (consolidation) => this.state.set(successState(consolidation)),
      error: (error: unknown) => this.state.set(errorState(normalizeApiError(error), this.state().data)),
    });
  }

  goBack(): void {
    this.router.navigate(['/necesidades/consolidaciones']);
  }

  reverse(consolidation: NeedsConsolidation): void {
    this.confirm
      .confirm({
        title: 'Revertir consolidacion',
        message: `Revertir ${consolidation.number ?? consolidation.id}. Solo procede antes de la transferencia segun reglas del backend.`,
        confirmText: 'Revertir',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.reversing.set(true);
        this.needs.reverseConsolidation(consolidation.id).subscribe({
          next: (updated) => {
            this.reversing.set(false);
            this.state.set(successState(updated));
            this.notify.success('Consolidacion revertida.');
          },
          error: (error: unknown) => {
            this.reversing.set(false);
            this.notify.error(error);
          },
        });
      });
  }

  transfer(consolidation: NeedsConsolidation): void {
    this.confirm
      .confirm({
        title: 'Transferir a presupuesto',
        message: `Transferir ${consolidation.number ?? consolidation.id}. La misma clave de idempotencia se conserva mientras este intento siga activo.`,
        confirmText: 'Transferir',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        const key = this.transferKey() ?? this.idempotency.createKey();
        this.transferKey.set(key);
        this.transferring.set(true);
        this.needs.transferConsolidation(consolidation.id, key).subscribe({
          next: (updated) => {
            this.transferring.set(false);
            this.transferKey.set(null);
            this.state.set(successState(updated));
            this.notify.success('Consolidacion transferida a presupuesto.');
          },
          error: (error: unknown) => {
            this.transferring.set(false);
            this.notify.error(error);
          },
        });
      });
  }

  loadBalance(lineId: number): void {
    this.needs.getBalance(lineId, this.workspace.companyId()).subscribe({
      next: (balance) => this.balances.update((balances) => ({ ...balances, [lineId]: balance })),
      error: (error: unknown) => this.notify.error(error),
    });
  }

  createRequirement(line: NeedsConsolidationLine): void {
    if (!line.id) return;
    this.router.navigate(['/logistica/requerimientos/nuevo'], {
      queryParams: {
        needsLineId: line.id,
        itemCode: line.itemCode ?? null,
        quantity: this.lineTotal(line),
      },
    });
  }

  itemLabel(line: NeedsConsolidationLine): string {
    return [line.itemCode, line.itemName].filter(Boolean).join(' - ') || '-';
  }

  dimensionLabel(line: NeedsConsolidationLine): string {
    return [line.costCenterCode, line.financingSourceCode, line.goalCode, line.expenseClassifierCode]
      .filter(Boolean)
      .join(' / ') || '-';
  }

  lineTotal(line: NeedsConsolidationLine): number {
    if (line.totalQuantity !== undefined) return line.totalQuantity;
    return (line.monthlyQuantities ?? []).reduce((sum, month) => sum + Number(month.approvedQuantity ?? month.requestedQuantity ?? 0), 0);
  }

  balanceValue(balance: NeedsBalance): number {
    return balance.available ?? balance.total ?? 0;
  }

  amount(value: number): string {
    return formatAmount(value);
  }

  date(value: string | undefined): string {
    return formatDate(value);
  }

  json(value: unknown): string {
    return JSON.stringify(value ?? {}, null, 2);
  }
}
