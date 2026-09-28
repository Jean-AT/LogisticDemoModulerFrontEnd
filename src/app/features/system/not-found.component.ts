import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <main class="not-found">
      <mat-icon aria-hidden="true">search_off</mat-icon>
      <p class="code">404</p>
      <h1>Pagina no encontrada</h1>
      <p>La direccion no existe o ya no esta disponible.</p>
      <a mat-flat-button class="btn-primary" routerLink="/inicio">
        <mat-icon>home</mat-icon>
        Volver al inicio
      </a>
    </main>
  `,
  styles: [
    `
      .not-found {
        min-height: min(560px, calc(100vh - 160px));
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 32px 16px;
      }
      .not-found > mat-icon {
        width: 56px;
        height: 56px;
        font-size: 56px;
        color: var(--color-text-soft);
      }
      .code { margin: 16px 0 0; color: var(--color-primary-strong); font-weight: 700; }
      h1 { margin: 4px 0 0; font-size: 26px; }
      p:not(.code) { margin: 8px 0 24px; color: var(--color-text-soft); }
    `,
  ],
})
export class NotFoundComponent {}
