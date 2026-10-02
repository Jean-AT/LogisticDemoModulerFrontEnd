import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { normalizeApiError } from '../../core/api-error';
import { errorState, LoadState, loadingState, successState } from '../../core/load-state';
import { NotificationService } from '../../core/notification.service';
import { formatAmount, formatDate } from '../../core/utils';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { NeedsPlan, NeedsPlanLine } from './needs.models';
import { NeedsService } from './needs.service';

@Component({
  selector: 'app-needs-plan-detail',
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
      subtitle="Detalle del Cuadro, lineas mensuales y acciones permitidas por estado."
    >
      <button actions mat-stroked-button type="button" (click)="goBack()">
        <mat-icon>arrow_back</mat-icon>
        Volver
      </button>
      <button actions mat-stroked-button type="button" (click)="reload()">
        <mat-icon>refresh</mat-icon>
        Actualizar
      </button>
      @if (canEdit()) {
        <button actions mat-flat-button class="btn-primary" type="button" (click)="edit()">
          <mat-icon>edit</mat-icon>
          Editar
        </button>
      }
    </app-page-header>

    @switch (state().status) {
      @case ('loading') {
        <div class="inline-state"><mat-spinner diameter="24" /> Cargando Cuadro...</div>
      }
      @case ('error') {
        <div class="error-box">
          <span>{{ state().error?.detail }}</span>
          <button mat-button type="button" (click)="reload()">Reintentar</button>
        </div>
      }
      @case ('success') {
        @let plan = currentPlan();
        <section class="summary">
          <div>
            <span class="label">Estado</span>
            <app-status-chip [estado]="plan.status" />
          </div>
          <div>
            <span class="label">Compania</span>
            <strong>{{ plan.companyId ?? '-' }}</strong>
          </div>
          <div>
            <span class="label">Ejercicio</span>
            <strong>{{ plan.fiscalYear ?? '-' }}</strong>
          </div>
          <div>
            <span class="label">Solicitante</span>
            <strong>{{ plan.requester || '-' }}</strong>
          </div>
          <div>
            <span class="label">Actualizado</span>
            <strong>{{ date(plan.updatedAt || plan.createdAt) }}</strong>
          </div>
        </section>

        <section class="actions">
          <button mat-flat-button class="btn-primary" type="button" [disabled]="plan.status !== 'DRAFT'" (click)="submit(plan)">
            <mat-icon>send</mat-icon>
            Enviar
          </button>
          <button mat-flat-button class="btn-primary" type="button" [disabled]="plan.status !== 'SUBMITTED'" (click)="review(plan)">
            <mat-icon>fact_check</mat-icon>
            Revisar
          </button>
          <button mat-stroked-button type="button" [disabled]="plan.status !== 'SUBMITTED'" (click)="observe(plan)">
            <mat-icon>feedback</mat-icon>
            Observar
          </button>
          <button mat-flat-button class="btn-danger" type="button" [disabled]="plan.status !== 'SUBMITTED'" (click)="reject(plan)">
            <mat-icon>block</mat-icon>
            Rechazar
          </button>
        </section>

        <div class="warning-box">
          <mat-icon>info</mat-icon>
          Las acciones de enviar/revisar dependen de ventanas activas de Cuadro. Sin API de ventanas, el backend puede responder 409 y la UI mostrara la regla exacta.
        </div>

        <section class="section">
          <h3>Lineas</h3>
          <div class="table-wrap">
            <table mat-table [dataSource]="plan.details">
              <ng-container matColumnDef="item">
                <th mat-header-cell *matHeaderCellDef>Item</th>
                <td mat-cell *matCellDef="let row">{{ itemLabel(row) }}</td>
              </ng-container>
              <ng-container matColumnDef="dimensions">
                <th mat-header-cell *matHeaderCellDef>Dimensiones</th>
                <td mat-cell *matCellDef="let row">{{ dimensionLabel(row) }}</td>
              </ng-container>
              <ng-container matColumnDef="requested">
                <th mat-header-cell *matHeaderCellDef>Solicitado</th>
                <td mat-cell *matCellDef="let row">{{ amount(total(row, 'requested')) }}</td>
              </ng-container>
              <ng-container matColumnDef="reviewed">
                <th mat-header-cell *matHeaderCellDef>Revisado</th>
                <td mat-cell *matCellDef="let row">{{ amount(total(row, 'reviewed')) }}</td>
              </ng-container>
              <ng-container matColumnDef="approved">
                <th mat-header-cell *matHeaderCellDef>Aprobado</th>
                <td mat-cell *matCellDef="let row">{{ amount(total(row, 'approved')) }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </div>
        </section>

        <section class="section">
          <h3>Respuesta cruda</h3>
          <pre>{{ json(plan.raw) }}</pre>
        </section>
      }
    }
  `,
  styles: [
    `
      .inline-state, .warning-box, .error-box {
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 8px;
        padding: 14px;
      }
      .inline-state { color: var(--color-text-soft); }
      .error-box { justify-content: space-between; background: #fde8ec; color: var(--color-danger); }
      .warning-box { margin: 16px 0; background: #fff8eb; color: #8a5a05; }
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
      .table-wrap { overflow-x: auto; }
      table { width: 100%; min-width: 760px; }
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
export class NeedsPlanDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly needs = inject(NeedsService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);
  private readonly id = Number(this.route.snapshot.paramMap.get('id'));

  readonly columns = ['item', 'dimensions', 'requested', 'reviewed', 'approved'];
  readonly state = signal<LoadState<NeedsPlan>>(loadingState());

  constructor() {
    this.reload();
  }

  title(): string {
    const plan = this.state().data;
    return plan?.number ? `Cuadro ${plan.number}` : `Cuadro ${this.id}`;
  }

  currentPlan(): NeedsPlan {
    const plan = this.state().data;
    if (!plan) {
      throw new Error('No hay Cuadro cargado.');
    }
    return plan;
  }

  reload(): void {
    this.state.set(loadingState(this.state().data));
    this.needs.getPlan(this.id).subscribe({
      next: (plan) => this.state.set(successState(plan)),
      error: (error: unknown) => this.state.set(errorState(normalizeApiError(error), this.state().data)),
    });
  }

  goBack(): void {
    this.router.navigate(['/necesidades/planes']);
  }

  canEdit(): boolean {
    const status = this.state().data?.status;
    return status === 'DRAFT' || status === 'OBSERVED';
  }

  edit(): void {
    this.router.navigate(['/necesidades/planes', this.id, 'editar']);
  }

  submit(plan: NeedsPlan): void {
    this.confirm
      .confirm({
        title: 'Enviar Cuadro',
        message: `Enviar ${plan.number ?? plan.id} a revision. El backend validara la ventana activa.`,
        confirmText: 'Enviar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.needs.submitPlan(plan.id).subscribe({
          next: (updated) => {
            this.state.set(successState(updated));
            this.notify.success('Cuadro enviado a revision.');
          },
          error: (error: unknown) => this.notify.error(error),
        });
      });
  }

  review(plan: NeedsPlan): void {
    this.confirm
      .confirm({
        title: 'Revisar Cuadro',
        message: `Registrar revision para ${plan.number ?? plan.id}. Las cantidades aprobadas deben venir del detalle V2 completo.`,
        confirmText: 'Revisar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.needs.reviewPlan(plan.id, { comment: 'Revision registrada desde UI V2' }).subscribe({
          next: (updated) => {
            this.state.set(successState(updated));
            this.notify.success('Cuadro revisado correctamente.');
          },
          error: (error: unknown) => this.notify.error(error),
        });
      });
  }

  observe(plan: NeedsPlan): void {
    this.confirm
      .askComment({
        title: 'Observar Cuadro',
        message: `Indica el motivo de observacion para ${plan.number ?? plan.id}.`,
        confirmText: 'Observar',
        comentarioLabel: 'Motivo',
      })
      .subscribe((comment) => {
        if (!comment) return;
        this.needs.observePlan(plan.id, { comment }).subscribe({
          next: (updated) => {
            this.state.set(successState(updated));
            this.notify.success('Cuadro observado.');
          },
          error: (error: unknown) => this.notify.error(error),
        });
      });
  }

  reject(plan: NeedsPlan): void {
    this.confirm
      .askComment({
        title: 'Rechazar Cuadro',
        message: `Indica el motivo de rechazo para ${plan.number ?? plan.id}.`,
        confirmText: 'Rechazar',
        comentarioLabel: 'Motivo',
        danger: true,
      })
      .subscribe((comment) => {
        if (!comment) return;
        this.needs.rejectPlan(plan.id, { comment }).subscribe({
          next: (updated) => {
            this.state.set(successState(updated));
            this.notify.success('Cuadro rechazado.');
          },
          error: (error: unknown) => this.notify.error(error),
        });
      });
  }

  itemLabel(line: NeedsPlanLine): string {
    return [line.itemCode, line.itemName].filter(Boolean).join(' - ') || '-';
  }

  dimensionLabel(line: NeedsPlanLine): string {
    return [line.costCenterCode, line.financingSourceCode, line.goalCode, line.expenseClassifierCode]
      .filter(Boolean)
      .join(' / ') || '-';
  }

  total(line: NeedsPlanLine, kind: 'requested' | 'reviewed' | 'approved'): number {
    const direct = kind === 'requested' ? line.requestedTotal : kind === 'reviewed' ? line.reviewedTotal : line.approvedTotal;
    if (direct !== undefined) return direct;
    const key = kind === 'requested' ? 'requestedQuantity' : kind === 'reviewed' ? 'reviewedQuantity' : 'approvedQuantity';
    return (line.months ?? []).reduce((sum, month) => sum + Number(month[key] ?? 0), 0);
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
