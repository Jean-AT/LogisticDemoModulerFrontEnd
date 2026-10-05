import { ChangeDetectionStrategy, Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { PdfHeaderFormComponent } from '../../shared/pdf-header-form.component';
import { ConfirmDialogService } from '../../shared/confirm-dialog.service';
import { ComprasService } from '../../core/services/compras.service';
import { OrdenCompra, PdfHeaderData } from '../../core/models';
import { downloadBlob, errorMessage, formatDate, formatMoney } from '../../core/utils';

@Component({
  selector: 'app-orden-compra-detalle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    PageHeaderComponent,
    PdfHeaderFormComponent,
  ],
  templateUrl: './orden-compra-detalle.component.html',
  styles: [
    `
      .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
      .card { padding: 20px; margin-bottom: 20px; }
      .detail-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
      .detail-list .k { display: block; font-size: 12px; color: var(--color-text-soft); }
      .detail-list .v { font-weight: 600; }
      table { width: 100%; }
      .total-card { font-size: 15px; }
      .total-card .row { display: flex; justify-content: space-between; padding: 6px 0; }
      .total-card .grand { border-top: 1px solid var(--color-border); margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 18px; }
    `,
  ],
})
export class OrdenCompraDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(ComprasService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly snack = inject(MatSnackBar);

  @ViewChild(PdfHeaderFormComponent) headerForm!: PdfHeaderFormComponent;

  readonly oc = signal<OrdenCompra | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly approving = signal(false);
  readonly columns = ['item', 'almacen', 'cantidad', 'precio', 'subtotal'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.service.getById(id).subscribe({
      next: (o) => this.oc.set(o),
      error: (err) => this.snack.open(errorMessage(err), 'Cerrar'),
      complete: () => this.loading.set(false),
    });
  }

  money(v: number, moneda: string) {
    return formatMoney(v, moneda as 'PEN' | 'USD');
  }

  fecha(v: string) {
    return formatDate(v);
  }

  exportarPdf(): void {
    const oc = this.oc()!;
    const header: PdfHeaderData = this.headerForm?.value() ?? {};
    this.exporting.set(true);
    this.service.downloadPdf(oc.id, header).subscribe({
      next: (blob) => downloadBlob(blob, `orden-compra-${oc.numero}.pdf`),
      error: (err) => this.snack.open(errorMessage(err), 'Cerrar'),
      complete: () => this.exporting.set(false),
    });
  }

  aprobar(): void {
    const oc = this.oc();
    if (!oc) return;
    this.confirm
      .confirm({
        title: 'Aprobar orden de compra',
        message: `Aprobar ${oc.numero}. El backend comprometera presupuesto; puede responder 409 si no hay disponibilidad.`,
        confirmText: 'Aprobar OC',
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.approving.set(true);
        this.service.aprobarOrden(oc.id).subscribe({
          next: (updated) => {
            this.oc.set(updated);
            this.snack.open('Orden aprobada; presupuesto comprometido si correspondia.', 'OK', { duration: 3000 });
          },
          error: (err) => this.snack.open(errorMessage(err), 'Cerrar'),
          complete: () => this.approving.set(false),
        });
      });
  }

  verRequerimiento(): void {
    this.router.navigate(['/logistica/requerimientos', this.oc()!.requerimientoId]);
  }

  volver(): void {
    this.router.navigate(['/logistica/compras']);
  }
}
