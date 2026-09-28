import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-module-pending',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <section class="module-state" aria-labelledby="module-title">
      <mat-icon aria-hidden="true">{{ icon }}</mat-icon>
      <div>
        <p class="eyebrow">Version 2</p>
        <h1 id="module-title">{{ title }}</h1>
        <p>{{ message }}</p>
      </div>
    </section>
  `,
  styles: [
    `
      .module-state {
        min-height: 280px;
        display: grid;
        grid-template-columns: 52px minmax(0, 560px);
        align-content: center;
        gap: 20px;
        padding: 32px 0;
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
      .eyebrow {
        margin: 0 0 4px;
        color: var(--color-primary-strong);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }
      h1 { margin: 0; font-size: 26px; }
      p:last-child { margin: 8px 0 0; color: var(--color-text-soft); line-height: 1.5; }
      @media (max-width: 480px) {
        .module-state { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ModulePendingComponent {
  private readonly route = inject(ActivatedRoute);
  readonly icon = this.route.snapshot.data['icon'] as string;
  readonly title = this.route.snapshot.data['title'] as string;
  readonly message = this.route.snapshot.data['message'] as string;
}
