import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';

const solicitanteRoles = ['SOLICITANTE', 'ADMIN'] as const;
const aprobadorRoles = ['APROBADOR', 'ADMIN'] as const;
const comprasRoles = ['COMPRAS', 'ADMIN'] as const;

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio | ERP Institucional',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'necesidades',
        canActivate: [roleGuard([...solicitanteRoles, 'APROBADOR'])],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'planes' },
          {
            path: 'planes',
            title: 'Cuadro de necesidades | ERP Institucional',
            loadComponent: () =>
              import('./features/needs/needs-plans-list.component').then((m) => m.NeedsPlansListComponent),
          },
          {
            path: 'planes/nuevo',
            title: 'Nuevo Cuadro | ERP Institucional',
            loadComponent: () =>
              import('./features/needs/needs-plan-form-placeholder.component').then(
                (m) => m.NeedsPlanFormPlaceholderComponent,
              ),
          },
          {
            path: 'planes/:id',
            title: 'Detalle de Cuadro | ERP Institucional',
            loadComponent: () =>
              import('./features/needs/needs-plan-detail.component').then((m) => m.NeedsPlanDetailComponent),
          },
        ],
      },
      {
        path: 'presupuesto',
        canActivate: [roleGuard([...aprobadorRoles])],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'pia' },
          {
            path: 'pia',
            title: 'Presupuesto | ERP Institucional',
            loadComponent: () =>
              import('./features/system/module-pending.component').then((m) => m.ModulePendingComponent),
            data: {
              icon: 'account_balance',
              title: 'Presupuesto',
              message: 'La gestion de PIA, PIM y disponibilidad se habilitara al integrar sus contratos V2.',
            },
          },
        ],
      },
      { path: 'logistica', pathMatch: 'full', redirectTo: 'logistica/requerimientos' },
      {
        path: 'logistica/requerimientos',
        loadComponent: () =>
          import('./features/requerimientos/requerimientos-list.component').then(
            (m) => m.RequerimientosListComponent,
          ),
        canActivate: [roleGuard([...solicitanteRoles])],
      },
      {
        path: 'logistica/requerimientos/nuevo',
        loadComponent: () =>
          import('./features/requerimientos/requerimiento-form.component').then(
            (m) => m.RequerimientoFormComponent,
          ),
        canActivate: [roleGuard([...solicitanteRoles])],
      },
      {
        path: 'logistica/requerimientos/:id',
        loadComponent: () =>
          import('./features/requerimientos/requerimiento-detalle.component').then(
            (m) => m.RequerimientoDetalleComponent,
          ),
      },
      {
        path: 'logistica/requerimientos/:id/editar',
        loadComponent: () =>
          import('./features/requerimientos/requerimiento-form.component').then(
            (m) => m.RequerimientoFormComponent,
          ),
        canActivate: [roleGuard([...solicitanteRoles])],
      },
      {
        path: 'logistica/aprobaciones',
        loadComponent: () =>
          import('./features/aprobaciones/aprobaciones-list.component').then(
            (m) => m.AprobacionesListComponent,
          ),
        canActivate: [roleGuard([...aprobadorRoles])],
      },
      {
        path: 'logistica/aprobaciones/:id',
        loadComponent: () =>
          import('./features/aprobaciones/aprobacion-detalle.component').then(
            (m) => m.AprobacionDetalleComponent,
          ),
        canActivate: [roleGuard(['APROBADOR', 'ADMIN', 'COMPRAS'])],
      },
      {
        path: 'logistica/compras',
        loadComponent: () =>
          import('./features/compras/compras-page.component').then((m) => m.ComprasPageComponent),
        canActivate: [roleGuard([...comprasRoles])],
      },
      {
        path: 'logistica/ordenes',
        loadComponent: () =>
          import('./features/compras/compras-page.component').then((m) => m.ComprasPageComponent),
        canActivate: [roleGuard([...comprasRoles])],
      },
      {
        path: 'logistica/ordenes/:id',
        loadComponent: () =>
          import('./features/compras/orden-compra-detalle.component').then(
            (m) => m.OrdenCompraDetalleComponent,
          ),
        canActivate: [roleGuard(['COMPRAS', 'ADMIN', 'APROBADOR'])],
      },
      {
        path: 'inventario',
        title: 'Inventario | ERP Institucional',
        canActivate: [roleGuard([...comprasRoles])],
        loadComponent: () =>
          import('./features/system/module-pending.component').then((m) => m.ModulePendingComponent),
        data: {
          icon: 'inventory',
          title: 'Inventario',
          message: 'Kardex, recepciones y proyeccion se habilitaran con la integracion de inventario V2.',
        },
      },
      { path: 'maestros', pathMatch: 'full', redirectTo: 'maestros/items' },
      {
        path: 'maestros/items',
        loadComponent: () =>
          import('./features/maestros/maestros-items.component').then((m) => m.MaestrosItemsComponent),
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'maestros/almacenes',
        loadComponent: () =>
          import('./features/maestros/maestros-almacenes.component').then(
            (m) => m.MaestrosAlmacenesComponent,
          ),
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'maestros/proveedores',
        loadComponent: () =>
          import('./features/maestros/maestros-proveedores.component').then(
            (m) => m.MaestrosProveedoresComponent,
          ),
        canActivate: [roleGuard(['ADMIN'])],
      },
      {
        path: 'plataforma',
        canActivate: [roleGuard(['ADMIN'])],
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'catalogo' },
          {
            path: 'catalogo',
            title: 'Plataforma | ERP Institucional',
            loadComponent: () =>
              import('./features/platform/platform-page.component').then((m) => m.PlatformPageComponent),
          },
          { path: 'accesos', pathMatch: 'full', redirectTo: 'catalogo' },
          { path: 'periodos', pathMatch: 'full', redirectTo: 'catalogo' },
          { path: 'secuencias', pathMatch: 'full', redirectTo: 'catalogo' },
        ],
      },

      // Compatibility aliases retained while feature code and bookmarks migrate to V2 routes.
      { path: 'dashboard', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'requerimientos', pathMatch: 'full', redirectTo: 'logistica/requerimientos' },
      { path: 'requerimientos/nuevo', pathMatch: 'full', redirectTo: 'logistica/requerimientos/nuevo' },
      { path: 'requerimientos/:id/editar', redirectTo: 'logistica/requerimientos/:id/editar' },
      { path: 'requerimientos/:id', redirectTo: 'logistica/requerimientos/:id' },
      { path: 'aprobaciones', pathMatch: 'full', redirectTo: 'logistica/aprobaciones' },
      { path: 'aprobaciones/:id', redirectTo: 'logistica/aprobaciones/:id' },
      { path: 'compras', pathMatch: 'full', redirectTo: 'logistica/compras' },
      { path: 'compras/ordenes/:id', redirectTo: 'logistica/ordenes/:id' },
      {
        path: '**',
        title: 'Pagina no encontrada | ERP Institucional',
        loadComponent: () =>
          import('./features/system/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('./features/system/not-found.component').then((m) => m.NotFoundComponent),
  },
];
