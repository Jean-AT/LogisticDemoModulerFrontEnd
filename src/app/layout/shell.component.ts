import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UserRole } from '../core/models';
import { SessionService } from '../core/session.service';
import { AuthService } from '../core/services/auth.service';
import { WorkspaceContextService } from '../core/workspace-context.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  roles: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL_ROLES: UserRole[] = ['SOLICITANTE', 'APROBADOR', 'COMPRAS', 'ADMIN'];

const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    items: [{ label: 'Inicio', icon: 'home', link: '/inicio', roles: ALL_ROLES }],
  },
  {
    label: 'Planeamiento',
    items: [
      {
        label: 'Necesidades',
        icon: 'view_timeline',
        link: '/necesidades/planes',
        roles: ['SOLICITANTE', 'APROBADOR', 'ADMIN'],
      },
      {
        label: 'Presupuesto',
        icon: 'account_balance',
        link: '/presupuesto/pia',
        roles: ['APROBADOR', 'ADMIN'],
      },
    ],
  },
  {
    label: 'Logistica',
    items: [
      {
        label: 'Requerimientos',
        icon: 'description',
        link: '/logistica/requerimientos',
        roles: ['SOLICITANTE', 'ADMIN'],
      },
      {
        label: 'Aprobaciones',
        icon: 'fact_check',
        link: '/logistica/aprobaciones',
        roles: ['APROBADOR', 'ADMIN'],
      },
      {
        label: 'Compras',
        icon: 'shopping_cart',
        link: '/logistica/compras',
        roles: ['COMPRAS', 'ADMIN'],
      },
    ],
  },
  {
    label: 'Almacen',
    items: [
      {
        label: 'Inventario',
        icon: 'inventory',
        link: '/inventario',
        roles: ['COMPRAS', 'ADMIN'],
      },
    ],
  },
  {
    label: 'Administracion',
    items: [
      { label: 'Maestros', icon: 'inventory_2', link: '/maestros', roles: ['ADMIN'] },
      { label: 'Plataforma', icon: 'settings', link: '/plataforma', roles: ['ADMIN'] },
    ],
  },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatTooltipModule,
  ],
  templateUrl: './shell.component.html',
  styles: [
    `
      .shell { height: 100dvh; min-height: 100vh; display: flex; flex-direction: column; }
      .topbar {
        z-index: 3;
        display: flex;
        align-items: center;
        gap: 10px;
        height: 64px;
        padding: 0 18px;
        background: var(--color-surface) !important;
        color: var(--color-text) !important;
        border-bottom: 1px solid var(--color-border);
        box-shadow: 0 1px 4px rgba(28, 35, 48, 0.06);
      }
      .menu-btn { flex: 0 0 auto; }
      .brand-mark { color: var(--color-primary); }
      .title { font-size: 17px; font-weight: 700; white-space: nowrap; }
      .spacer { flex: 1; }
      .workspace-controls { display: flex; align-items: center; gap: 8px; }
      .context-field {
        min-width: 118px;
        height: 40px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px;
        border: 1px solid var(--color-border);
        border-radius: 6px;
        background: #fff;
      }
      .context-field.company { min-width: 210px; }
      .context-field mat-icon { flex: 0 0 auto; color: var(--color-text-soft); font-size: 19px; }
      .context-field label { min-width: 0; display: flex; flex-direction: column; line-height: 1.05; }
      .context-label { color: var(--color-text-soft); font-size: 10px; font-weight: 600; text-transform: uppercase; }
      .context-field select {
        max-width: 176px;
        border: 0;
        outline: 0;
        padding: 0;
        background: transparent;
        color: var(--color-text);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
      }
      .context-field select:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
      .user-box { display: flex; align-items: center; gap: 9px; min-width: 0; }
      .avatar {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        display: grid;
        place-items: center;
        border-radius: 50%;
        background: var(--color-primary-soft);
        color: var(--color-primary-strong);
        font-weight: 700;
      }
      .user-meta { min-width: 0; display: flex; flex-direction: column; line-height: 1.15; }
      .user-name { max-width: 150px; overflow: hidden; font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
      .user-role { color: var(--color-text-soft); font-size: 11px; }
      .rest { flex: 1; min-height: 0; background: var(--color-bg); }
      .sidenav {
        width: 264px;
        background: var(--color-surface) !important;
        border: 0;
        border-right: 1px solid var(--color-border);
        border-radius: 0;
      }
      .sidenav-brand { display: flex; align-items: center; gap: 10px; padding: 20px 18px 14px; }
      .sidenav-brand .logo {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 7px;
        background: var(--color-primary);
        color: #fff;
      }
      .sidenav-brand .name { font-size: 13px; font-weight: 700; }
      .sidenav-brand .sub { color: var(--color-text-soft); font-size: 11px; }
      .mobile-context { margin: 0 12px 12px; padding: 10px; border: 1px solid var(--color-border); border-radius: 6px; }
      .mobile-context span { display: block; color: var(--color-text-soft); font-size: 11px; }
      .mobile-context strong { display: block; margin-top: 2px; font-size: 13px; }
      .nav-group { padding: 2px 8px 8px; }
      .nav-heading { margin: 10px 10px 4px; color: var(--color-text-soft); font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .nav-item { height: 44px; margin: 2px 0; border-radius: 6px; color: var(--color-text); }
      .nav-item.active { background: var(--color-primary-soft); color: var(--color-primary-strong); font-weight: 700; }
      .nav-item mat-icon { color: currentColor; }
      .content { overflow: auto; }
      .content-inner { width: min(100%, 1440px); min-height: 100%; margin: 0 auto; padding: 24px 28px 40px; }

      @media (max-width: 1100px) {
        .context-field.company { min-width: 170px; }
        .context-field.company select { max-width: 136px; }
        .user-meta { display: none; }
      }
      @media (max-width: 760px) {
        .topbar { height: 56px; padding: 0 8px; gap: 6px; }
        .title, .context-field.company { display: none; }
        .context-field { min-width: 96px; height: 36px; padding: 3px 7px; }
        .context-field select { font-size: 12px; }
        .content-inner { padding: 18px 16px 32px; }
      }
      @media (max-width: 420px) {
        .brand-mark, .context-field mat-icon { display: none; }
        .context-field { min-width: 78px; }
        .avatar { width: 30px; height: 30px; flex-basis: 30px; }
      }
    `,
  ],
})
export class ShellComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly breakpoint = inject(BreakpointObserver);

  readonly workspace = inject(WorkspaceContextService);
  readonly user = this.session.user;
  readonly role = this.session.role;
  readonly isMobile = signal(false);
  readonly mobileOpened = signal(false);

  readonly navGroups = computed<NavGroup[]>(() => {
    const role = this.role();
    if (!role) return [];

    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    })).filter((group) => group.items.length > 0);
  });

  constructor() {
    this.breakpoint
      .observe('(max-width: 960px)')
      .pipe(takeUntilDestroyed())
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        if (!result.matches) this.mobileOpened.set(false);
      });
  }

  selectCompany(value: string): void {
    this.workspace.selectCompany(value === '' ? null : Number(value));
  }

  selectFiscalYear(value: string): void {
    this.workspace.selectFiscalYear(Number(value));
  }

  closeMobileNav(): void {
    if (this.isMobile()) this.mobileOpened.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
