import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_V1_PATH } from '../api.config';
import { AprobacionesService } from './aprobaciones.service';

describe('AprobacionesService', () => {
  let service: AprobacionesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AprobacionesService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AprobacionesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists approval requests with V2 filters', () => {
    service
      .list({ id: 10, estado: 'ENVIADO', numero: 'REQ-1', proveedorId: 4, fechaDesde: '2026-01-01', fechaHasta: '2026-01-31', page: 2, size: 25 })
      .subscribe();

    const req = http.expectOne((request) => request.url === `${API_V1_PATH}/aprobaciones`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('id')).toBe('10');
    expect(req.request.params.get('estado')).toBe('ENVIADO');
    expect(req.request.params.get('numero')).toBe('REQ-1');
    expect(req.request.params.get('proveedorId')).toBe('4');
    expect(req.request.params.get('fechaDesde')).toBe('2026-01-01');
    expect(req.request.params.get('fechaHasta')).toBe('2026-01-31');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({ content: [], page: 2, size: 25, totalElements: 0, totalPages: 0 });
  });

  it('executes approval decisions', () => {
    service.aprobar(10, { comentario: 'ok' }).subscribe();
    service.observar(10, { comentario: 'corregir' }).subscribe();
    service.rechazar(10, { comentario: 'no procede' }).subscribe();

    const approve = http.expectOne(`${API_V1_PATH}/aprobaciones/10/aprobar`);
    expect(approve.request.method).toBe('POST');
    expect(approve.request.body).toEqual({ comentario: 'ok' });
    approve.flush({ id: 10, estado: 'APROBADO' });

    const observe = http.expectOne(`${API_V1_PATH}/aprobaciones/10/observar`);
    expect(observe.request.method).toBe('POST');
    expect(observe.request.body).toEqual({ comentario: 'corregir' });
    observe.flush({ id: 10, estado: 'OBSERVADO' });

    const reject = http.expectOne(`${API_V1_PATH}/aprobaciones/10/rechazar`);
    expect(reject.request.method).toBe('POST');
    expect(reject.request.body).toEqual({ comentario: 'no procede' });
    reject.flush({ id: 10, estado: 'RECHAZADO' });
  });

  it('downloads approval PDF with institutional header params', () => {
    service.downloadPdf(10, { entidad: 'Entidad', asunto: 'Aprobacion' }).subscribe((blob) => {
      expect(blob.size).toBeGreaterThan(0);
    });

    const req = http.expectOne((request) => request.url === `${API_V1_PATH}/aprobaciones/10/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('entidad')).toBe('Entidad');
    expect(req.request.params.get('asunto')).toBe('Aprobacion');
    req.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });
});
