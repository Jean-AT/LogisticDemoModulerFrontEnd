import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_V1_PATH } from '../api.config';
import { RequerimientosService } from './requerimientos.service';

describe('RequerimientosService', () => {
  let service: RequerimientosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RequerimientosService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RequerimientosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists requirements with V2 filters', () => {
    service.list({ estado: 'BORRADOR', numero: 'REQ-1', fechaDesde: '2026-01-01', fechaHasta: '2026-01-31', page: 1, size: 20 }).subscribe();

    const req = http.expectOne((request) => request.url === `${API_V1_PATH}/requerimientos`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('estado')).toBe('BORRADOR');
    expect(req.request.params.get('numero')).toBe('REQ-1');
    expect(req.request.params.get('fechaDesde')).toBe('2026-01-01');
    expect(req.request.params.get('fechaHasta')).toBe('2026-01-31');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({ content: [], page: 1, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('creates manual and from-needs requirements', () => {
    const payload = {
      descripcion: 'Compra',
      proveedorId: 1,
      moneda: 'PEN' as const,
      detalles: [{ itemId: 1, almacenId: 1, cantidad: 2, precioUnitarioEstimado: 10 }],
    };

    service.create(payload).subscribe();
    service.createFromNeedsLine({ ...payload, needsLineId: 55 }).subscribe();

    const manual = http.expectOne((request) => request.url === `${API_V1_PATH}/requerimientos` && request.method === 'POST');
    expect(manual.request.body).toEqual(payload);
    manual.flush({ id: 10, numero: 'REQ-10' });

    const fromNeeds = http.expectOne(
      (request) => request.url === `${API_V1_PATH}/requerimientos/desde-cuadro` && request.method === 'POST',
    );
    expect(fromNeeds.request.body).toEqual({ ...payload, needsLineId: 55 });
    fromNeeds.flush({ id: 11, numero: 'REQ-11' });
  });

  it('gets, updates, sends and downloads a requirement', () => {
    const payload = {
      descripcion: 'Compra',
      proveedorId: 1,
      moneda: 'PEN' as const,
      detalles: [{ itemId: 1, almacenId: 1, cantidad: 2, precioUnitarioEstimado: 10 }],
    };

    service.getById(10).subscribe();
    service.update(10, payload).subscribe();
    service.enviar(10).subscribe();
    service.downloadPdf(10, { entidad: 'Entidad', asunto: 'Compra' }).subscribe();

    const detail = http.expectOne((request) => request.url === `${API_V1_PATH}/requerimientos/10` && request.method === 'GET');
    expect(detail.request.method).toBe('GET');
    detail.flush({ id: 10 });

    const update = http.expectOne((request) => request.url === `${API_V1_PATH}/requerimientos/10` && request.method === 'PUT');
    expect(update.request.body).toEqual(payload);
    update.flush({ id: 10 });

    const send = http.expectOne(`${API_V1_PATH}/requerimientos/10/enviar`);
    expect(send.request.method).toBe('POST');
    send.flush({ id: 10, estado: 'ENVIADO' });

    const pdf = http.expectOne((request) => request.url === `${API_V1_PATH}/requerimientos/10/pdf`);
    expect(pdf.request.method).toBe('GET');
    expect(pdf.request.params.get('entidad')).toBe('Entidad');
    expect(pdf.request.params.get('asunto')).toBe('Compra');
    pdf.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });
});
