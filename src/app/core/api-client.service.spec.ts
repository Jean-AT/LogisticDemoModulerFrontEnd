import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiClient } from './api-client.service';
import { ApiErrorWrapper } from './api-error';
import { API_V1_PATH } from './api.config';

describe('ApiClient', () => {
  let client: ApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiClient, provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(ApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('builds V2 GET requests with filtered params', () => {
    client.get('/needs/plans', { params: { companyId: 1, status: 'DRAFT', empty: '', skip: null } }).subscribe();

    const req = http.expectOne((request) => request.url === `${API_V1_PATH}/needs/plans`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('companyId')).toBe('1');
    expect(req.request.params.get('status')).toBe('DRAFT');
    expect(req.request.params.has('empty')).toBe(false);
    expect(req.request.params.has('skip')).toBe(false);
    req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
  });

  it('adds idempotency key headers to mutations', () => {
    client.post('/needs/consolidations/10/transfer', {}, { idempotencyKey: 'idem-123' }).subscribe();

    const req = http.expectOne(`${API_V1_PATH}/needs/consolidations/10/transfer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('idem-123');
    req.flush({});
  });

  it('emits normalized API errors', () => {
    let captured: unknown;
    client.get('/budget/availability').subscribe({ error: (error: unknown) => (captured = error) });

    const req = http.expectOne(`${API_V1_PATH}/budget/availability`);
    req.flush({ detail: 'No se encontró disponibilidad.' }, { status: 404, statusText: 'Not Found' });

    expect(captured).toBeInstanceOf(ApiErrorWrapper);
    expect((captured as ApiErrorWrapper).apiError.kind).toBe('not-found');
    expect((captured as ApiErrorWrapper).apiError.detail).toBe('No se encontró disponibilidad.');
  });
});
