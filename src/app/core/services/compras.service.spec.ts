import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_V1_PATH } from '../api.config';
import { ComprasService } from './compras.service';

describe('ComprasService', () => {
  let service: ComprasService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ComprasService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ComprasService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('covers quotation process operations', () => {
    service.abrirCotizacion(10).subscribe((result) => expect(result.procesoId).toBe(20));
    service.registrarOferta(20, { requerimientoDetalleId: 1, proveedorId: 2, precioUnitario: 15, plazoDias: 5 }).subscribe();
    service.cerrarCotizacion(20).subscribe();
    service.adjudicarCotizacion(20, { ofertaId: 30, comentario: 'mejor precio' }).subscribe((result) => {
      expect(result.adjudicacionId).toBe(40);
    });
    service.getCotizacion(20).subscribe((process) => expect(process.ofertas.length).toBe(1));

    const open = http.expectOne(`${API_V1_PATH}/cotizaciones/procesos/requerimientos/10`);
    expect(open.request.method).toBe('POST');
    open.flush({ procesoId: 20, status: 'OPEN' });

    const offer = http.expectOne(`${API_V1_PATH}/cotizaciones/procesos/20/ofertas`);
    expect(offer.request.method).toBe('POST');
    expect(offer.request.body).toEqual({ requerimientoDetalleId: 1, proveedorId: 2, precioUnitario: 15, plazoDias: 5 });
    offer.flush({ id: 30, status: 'REGISTERED' });

    const close = http.expectOne(`${API_V1_PATH}/cotizaciones/procesos/20/cerrar`);
    expect(close.request.method).toBe('POST');
    close.flush({ procesoId: 20, status: 'CLOSED' });

    const award = http.expectOne(`${API_V1_PATH}/cotizaciones/procesos/20/adjudicar`);
    expect(award.request.method).toBe('POST');
    expect(award.request.body).toEqual({ ofertaId: 30, comentario: 'mejor precio' });
    award.flush({ adjudicacionId: 40, status: 'AWARDED' });

    const detail = http.expectOne(`${API_V1_PATH}/cotizaciones/procesos/20`);
    expect(detail.request.method).toBe('GET');
    detail.flush({ id: 20, ofertas: [{ id: 30 }] });
  });

  it('covers purchase order operations', () => {
    service.generarDesdeRequerimiento(10).subscribe();
    service.generarDesdeAdjudicacion(40).subscribe();
    service.aprobarOrden(50).subscribe();
    service.list({ numero: 'OC-1', proveedorId: 2, moneda: 'PEN', requerimientoId: 10, page: 0, size: 20 }).subscribe();
    service.getById(50).subscribe();
    service.downloadPdf(50, { entidad: 'Entidad' }).subscribe((blob) => expect(blob.size).toBeGreaterThan(0));

    const direct = http.expectOne(`${API_V1_PATH}/ordenes-compra/desde-requerimiento/10`);
    expect(direct.request.method).toBe('POST');
    direct.flush({ id: 50, numero: 'OC-50' });

    const fromAward = http.expectOne(`${API_V1_PATH}/ordenes-compra/desde-adjudicacion/40`);
    expect(fromAward.request.method).toBe('POST');
    fromAward.flush({ id: 51, numero: 'OC-51' });

    const approve = http.expectOne(`${API_V1_PATH}/ordenes-compra/50/aprobar`);
    expect(approve.request.method).toBe('POST');
    approve.flush({ id: 50, numero: 'OC-50' });

    const list = http.expectOne((request) => request.url === `${API_V1_PATH}/ordenes-compra`);
    expect(list.request.params.get('numero')).toBe('OC-1');
    expect(list.request.params.get('proveedorId')).toBe('2');
    expect(list.request.params.get('moneda')).toBe('PEN');
    expect(list.request.params.get('requerimientoId')).toBe('10');
    list.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });

    const detail = http.expectOne(`${API_V1_PATH}/ordenes-compra/50`);
    expect(detail.request.method).toBe('GET');
    detail.flush({ id: 50, numero: 'OC-50' });

    const pdf = http.expectOne((request) => request.url === `${API_V1_PATH}/ordenes-compra/50/pdf`);
    expect(pdf.request.params.get('entidad')).toBe('Entidad');
    pdf.flush(new Blob(['pdf'], { type: 'application/pdf' }));
  });
});
