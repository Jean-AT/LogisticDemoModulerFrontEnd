import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CotizacionProceso } from '../../core/models';
import { NotificationService } from '../../core/notification.service';
import { ComprasService } from '../../core/services/compras.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-cotizacion-detalle',
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
    PageHeaderComponent,
  ],
  template: `
    <app-page-header [title]="title()" subtitle="Ofertas, cierre, adjudicacion y generacion de OC desde cotizacion.">
      <button actions mat-stroked-button type="button" (click)="reload()">
        <mat-icon>refresh</mat-icon>
        Actualizar
      </button>
      <button actions mat-stroked-button type="button" (click)="goCompras()">
        <mat-icon>arrow_back</mat-icon>
        Compras
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="inline-state"><mat-spinner diameter="24" /> Cargando cotizacion...</div>
    } @else if (proceso()) {
      <section class="summary">
        <div><span>Proceso</span><strong>{{ proceso()!.id }}</strong></div>
        <div><span>Requerimiento</span><strong>{{ proceso()!.requerimientoNumero || proceso()!.requerimientoId || '-' }}</strong></div>
        <div><span>Estado</span><strong>{{ proceso()!.status || '-' }}</strong></div>
        <div><span>Ofertas</span><strong>{{ proceso()!.ofertas.length }}</strong></div>
      </section>

      <section class="grid">
        <article class="section">
          <h3>Registrar oferta</h3>
          <form class="form-grid" [formGroup]="offerForm" (ngSubmit)="registrarOferta()">
            <mat-form-field appearance="outline">
              <mat-label>ID detalle requerimiento</mat-label>
              <input matInput type="number" formControlName="requerimientoDetalleId" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>ID proveedor</mat-label>
              <input matInput type="number" formControlName="proveedorId" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Precio unitario</mat-label>
              <input matInput type="number" min="0.01" step="0.01" formControlName="precioUnitario" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Plazo dias</mat-label>
              <input matInput type="number" min="0" formControlName="plazoDias" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Comentario</mat-label>
              <input matInput formControlName="comentario" />
            </mat-form-field>
            <button mat-flat-button class="btn-primary" type="submit" [disabled]="offerForm.invalid || savingOffer()">
              <mat-icon>add_shopping_cart</mat-icon>
              Registrar oferta
            </button>
          </form>
        </article>

        <article class="section">
          <h3>Cierre y adjudicacion</h3>
          <div class="form-grid">
            <button mat-flat-button class="btn-primary" type="button" [disabled]="closing()" (click)="cerrar()">
              <mat-icon>lock</mat-icon>
              Cerrar recepcion
            </button>
            <mat-form-field appearance="outline">
              <mat-label>ID oferta</mat-label>
              <input matInput type="number" [formControl]="offerId" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Comentario adjudicacion</mat-label>
              <input matInput [formControl]="awardComment" />
            </mat-form-field>
            <button mat-flat-button class="btn-primary" type="button" [disabled]="offerId.invalid || awarding()" (click)="adjudicar()">
              <mat-icon>verified</mat-icon>
              Adjudicar
            </button>
            <mat-form-field appearance="outline">
              <mat-label>ID adjudicacion</mat-label>
              <input matInput type="number" [formControl]="adjudicationId" />
            </mat-form-field>
            <button mat-flat-button class="btn-primary" type="button" [disabled]="adjudicationId.invalid || generatingOc()" (click)="generarOc()">
              <mat-icon>receipt_long</mat-icon>
              Generar OC
            </button>
          </div>
        </article>
      </section>

      <section class="section">
        <h3>Detalle de proceso</h3>
        <pre>{{ json(proceso()!.raw) }}</pre>
      </section>
    }
  `,
  styles: [
    `
      .inline-state { display: flex; align-items: center; gap: 10px; color: var(--color-text-soft); padding: 14px; }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        padding: 16px;
      }
      .summary span { display: block; font-size: 12px; color: var(--color-text-soft); text-transform: uppercase; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; margin-top: 16px; }
      .section { border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); padding: 16px; }
      h3 { margin: 0 0 12px; font-size: 16px; }
      .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; align-items: center; }
      .wide { grid-column: 1 / -1; }
      pre { margin: 0; max-height: 360px; overflow: auto; white-space: pre-wrap; }
    `,
  ],
})
export class CotizacionDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly compras = inject(ComprasService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly notify = inject(NotificationService);

  private readonly procesoId = Number(this.route.snapshot.paramMap.get('id'));
  readonly proceso = signal<CotizacionProceso | null>(null);
  readonly loading = signal(true);
  readonly savingOffer = signal(false);
  readonly closing = signal(false);
  readonly awarding = signal(false);
  readonly generatingOc = signal(false);

  readonly offerForm = new FormGroup({
    requerimientoDetalleId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    proveedorId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    precioUnitario: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(0.01)] }),
    plazoDias: new FormControl<number | null>(null),
    comentario: new FormControl('', { nonNullable: true }),
  });
  readonly offerId = new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] });
  readonly awardComment = new FormControl('', { nonNullable: true });
  readonly adjudicationId = new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] });

  constructor() {
    this.reload();
  }

  title(): string {
    return `Cotizacion ${this.proceso()?.id ?? this.procesoId}`;
  }

  reload(): void {
    this.loading.set(true);
    this.compras
      .getCotizacion(this.procesoId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (proceso) => this.proceso.set(proceso),
        error: (error: unknown) => this.notify.error(error),
      });
  }

  registrarOferta(): void {
    if (this.offerForm.invalid) return;
    const value = this.offerForm.getRawValue();
    this.savingOffer.set(true);
    this.compras
      .registrarOferta(this.procesoId, {
        requerimientoDetalleId: requiredNumber(value.requerimientoDetalleId),
        proveedorId: requiredNumber(value.proveedorId),
        precioUnitario: requiredNumber(value.precioUnitario),
        plazoDias: value.plazoDias ?? undefined,
        comentario: value.comentario || undefined,
      })
      .pipe(finalize(() => this.savingOffer.set(false)))
      .subscribe({
        next: () => {
          this.notify.success('Oferta registrada.');
          this.offerForm.reset();
          this.reload();
        },
        error: (error: unknown) => this.notify.error(error),
      });
  }

  cerrar(): void {
    this.confirm
      .confirm({
        title: 'Cerrar recepcion de ofertas',
        message: 'Despues del cierre solo se debe adjudicar una oferta elegible.',
        confirmText: 'Cerrar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.closing.set(true);
        this.compras
          .cerrarCotizacion(this.procesoId)
          .pipe(finalize(() => this.closing.set(false)))
          .subscribe({
            next: () => {
              this.notify.success('Cotizacion cerrada.');
              this.reload();
            },
            error: (error: unknown) => this.notify.error(error),
          });
      });
  }

  adjudicar(): void {
    const oferta = this.offerId.value;
    if (!oferta) return;
    this.confirm
      .confirm({
        title: 'Adjudicar cotizacion',
        message: 'La adjudicacion selecciona la oferta ganadora y habilita generar la orden de compra.',
        confirmText: 'Adjudicar',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.awarding.set(true);
        this.compras
          .adjudicarCotizacion(this.procesoId, { ofertaId: oferta, comentario: this.awardComment.value || undefined })
          .pipe(finalize(() => this.awarding.set(false)))
          .subscribe({
            next: (result) => {
              this.notify.success('Cotizacion adjudicada.');
              if (result.adjudicacionId) this.adjudicationId.setValue(result.adjudicacionId);
              this.reload();
            },
            error: (error: unknown) => this.notify.error(error),
          });
      });
  }

  generarOc(): void {
    const id = this.adjudicationId.value;
    if (!id) return;
    this.generatingOc.set(true);
    this.compras
      .generarDesdeAdjudicacion(id)
      .pipe(finalize(() => this.generatingOc.set(false)))
      .subscribe({
        next: (oc) => {
          this.notify.success(`OC ${oc.numero} generada.`);
          this.router.navigate(['/logistica/ordenes', oc.id]);
        },
        error: (error: unknown) => this.notify.error(error),
      });
  }

  goCompras(): void {
    this.router.navigate(['/logistica/compras']);
  }

  json(value: unknown): string {
    return JSON.stringify(value ?? {}, null, 2);
  }
}

function requiredNumber(value: number | null): number {
  if (value === null) throw new Error('Valor requerido.');
  return value;
}
