import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-needs-plan-form-placeholder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, PageHeaderComponent],
  template: `
    <app-page-header
      title="Nuevo Cuadro"
      subtitle="Formulario de 12 meses pendiente de conectar con catalogos completos y ventanas BE-FE02."
    />
    <section class="pending">
      <mat-icon>view_week</mat-icon>
      <div>
        <h3>Grilla mensual pendiente</h3>
        <p>
          La creacion requiere catalogos de Plataforma, ventana REGISTRATION activa y validacion de doce meses.
          La bandeja y el detalle ya consumen /api/v1/needs/plans; este formulario queda aislado para no simular
          cantidades ni dimensiones productivas.
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      .pending {
        display: grid;
        grid-template-columns: 52px minmax(0, 620px);
        gap: 18px;
        align-items: start;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-surface);
        padding: 20px;
      }
      mat-icon {
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 8px;
        background: var(--color-primary-soft);
        color: var(--color-primary-strong);
        font-size: 28px;
      }
      h3 { margin: 0 0 8px; }
      p { margin: 0; color: var(--color-text-soft); line-height: 1.5; }
      @media (max-width: 560px) {
        .pending { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class NeedsPlanFormPlaceholderComponent {}
