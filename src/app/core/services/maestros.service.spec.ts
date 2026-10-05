import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_V1_PATH } from '../api.config';
import { MaestrosService } from './maestros.service';

describe('MaestrosService', () => {
  let service: MaestrosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MaestrosService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MaestrosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists and creates logistic items through V2 API', () => {
    const payload = { code: 'ITM-1', name: 'Laptop', unitMeasure: 'UND' };

    service.getItems().subscribe((items) => expect(items.length).toBe(1));
    service.createItem(payload).subscribe((item) => expect(item.code).toBe('ITM-1'));

    const list = http.expectOne((request) => request.url === `${API_V1_PATH}/items` && request.method === 'GET');
    expect(list.request.method).toBe('GET');
    list.flush([{ id: 1, ...payload }]);

    const create = http.expectOne((request) => request.url === `${API_V1_PATH}/items` && request.method === 'POST');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ id: 1, ...payload });
  });

  it('lists and creates warehouses through V2 API', () => {
    const payload = { code: 'ALM-1', name: 'Central' };

    service.getAlmacenes().subscribe((items) => expect(items[0].code).toBe('ALM-1'));
    service.createAlmacen(payload).subscribe((item) => expect(item.name).toBe('Central'));

    const list = http.expectOne((request) => request.url === `${API_V1_PATH}/almacenes` && request.method === 'GET');
    expect(list.request.method).toBe('GET');
    list.flush([{ id: 1, ...payload }]);

    const create = http.expectOne((request) => request.url === `${API_V1_PATH}/almacenes` && request.method === 'POST');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ id: 1, ...payload });
  });

  it('lists and creates suppliers through V2 API', () => {
    const payload = { code: 'PRV-1', name: 'Proveedor SAC' };

    service.getProveedores().subscribe((items) => expect(items[0].name).toBe('Proveedor SAC'));
    service.createProveedor(payload).subscribe((item) => expect(item.code).toBe('PRV-1'));

    const list = http.expectOne((request) => request.url === `${API_V1_PATH}/proveedores` && request.method === 'GET');
    expect(list.request.method).toBe('GET');
    list.flush([{ id: 1, ...payload }]);

    const create = http.expectOne((request) => request.url === `${API_V1_PATH}/proveedores` && request.method === 'POST');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({ id: 1, ...payload });
  });
});
