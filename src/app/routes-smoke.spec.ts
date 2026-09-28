import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('Router smoke (real routes)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideAnimations(), provideHttpClient()],
    }).compileComponents();
  });

  it('navigates to login and renders the form through lazy routes', async () => {
    const router = TestBed.inject(Router);
    await router.navigate(['/login']);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Ingresar');
  });

  it('exposes the V2 module routes inside the authenticated shell', () => {
    const shell = routes.find((route) => route.path === '' && route.children);
    const paths = shell?.children?.map((route) => route.path);

    expect(paths).toContain('inicio');
    expect(paths).toContain('necesidades');
    expect(paths).toContain('presupuesto');
    expect(paths).toContain('logistica/requerimientos');
    expect(paths).toContain('logistica/aprobaciones');
    expect(paths).toContain('logistica/compras');
    expect(paths).toContain('inventario');
    expect(paths).toContain('plataforma');
  });

  it('keeps legacy URLs as redirects and renders a real fallback route', () => {
    const shell = routes.find((route) => route.path === '' && route.children);
    const children = shell?.children ?? [];

    expect(children.find((route) => route.path === 'dashboard')?.redirectTo).toBe('inicio');
    expect(children.find((route) => route.path === 'requerimientos')?.redirectTo).toBe(
      'logistica/requerimientos',
    );
    expect(children.find((route) => route.path === 'compras')?.redirectTo).toBe(
      'logistica/compras',
    );
    expect(children.find((route) => route.path === '**')?.loadComponent).toBeTypeOf('function');
  });
});
