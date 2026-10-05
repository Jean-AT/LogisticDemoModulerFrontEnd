import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RequerimientoFormComponent } from './features/requerimientos/requerimiento-form.component';
import { MaestrosService } from './core/services/maestros.service';
import { RequerimientosService } from './core/services/requerimientos.service';
import { NeedsService } from './features/needs/needs.service';
import { WorkspaceContextService } from './core/workspace-context.service';

describe('RequerimientoFormComponent smoke', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequerimientoFormComponent],
      providers: [
        provideRouter([]),
        provideAnimations(),
        {
          provide: MaestrosService,
          useValue: {
            getProveedores: () => of([{ id: 1, code: 'PRV', name: 'Proveedor' }]),
            getItems: () => of([{ id: 1, code: 'ITM', name: 'Item', unitMeasure: 'UND' }]),
            getAlmacenes: () => of([{ id: 1, code: 'ALM', name: 'Almacén' }]),
          },
        },
        {
          provide: RequerimientosService,
          useValue: {
            create: () => of({}),
            createFromNeedsLine: () => of({}),
            update: () => of({}),
            getById: () => of({}),
          },
        },
        {
          provide: NeedsService,
          useValue: {
            getBalance: () => of({ lineId: 1, available: 10, months: [], raw: {} }),
          },
        },
        {
          provide: WorkspaceContextService,
          useValue: { companyId: () => 1 },
        },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map(), queryParamMap: new Map() } } },
      ],
    }).compileComponents();
  });

  it('renders the dynamic detail rows without FormArray errors', () => {
    const fixture = TestBed.createComponent(RequerimientoFormComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Guardar borrador');
    expect(text).toContain('Agregar ítem');
  });
});
