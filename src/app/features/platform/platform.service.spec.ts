import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_V1_PATH } from '../../core/api.config';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  let service: PlatformService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlatformService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads companies from the V2 platform catalog and maps workspace context', () => {
    let companyName = '';
    service.listCompanies().subscribe((companies) => (companyName = companies[0].name));

    const req = http.expectOne(`${API_V1_PATH}/platform/catalog/companies`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 7, code: 'SBLM', name: 'Beneficencia de Lima' }]);

    expect(companyName).toBe('Beneficencia de Lima');
  });

  it('loads goal catalog with company and fiscal year filters', () => {
    service.listCatalog('goals', 7, 2026).subscribe();

    const req = http.expectOne((request) => request.url === `${API_V1_PATH}/platform/catalog/goals`);
    expect(req.request.params.get('companyId')).toBe('7');
    expect(req.request.params.get('fiscalYear')).toBe('2026');
    req.flush([]);
  });

  it('inspects user access by username', () => {
    service.getUserAccess('admin').subscribe();

    const req = http.expectOne(`${API_V1_PATH}/platform/security/users/admin/access`);
    expect(req.request.method).toBe('GET');
    req.flush({ username: 'admin', roles: ['ADMIN'] });
  });

  it('opens and closes fiscal periods through explicit actions', () => {
    service.openFiscalPeriod(7, 2026, 9).subscribe();
    service.closeFiscalPeriod(7, 2026, 9).subscribe();

    const open = http.expectOne(`${API_V1_PATH}/platform/fiscal-periods/7/2026/9/open`);
    expect(open.request.method).toBe('POST');
    open.flush({ companyId: 7, fiscalYear: 2026, month: 9, status: 'OPEN' });

    const close = http.expectOne(`${API_V1_PATH}/platform/fiscal-periods/7/2026/9/close`);
    expect(close.request.method).toBe('POST');
    close.flush({ companyId: 7, fiscalYear: 2026, month: 9, status: 'CLOSED' });
  });

  it('keeps document sequence next as an explicit POST', () => {
    service.nextDocumentSequence({ companyId: 7, fiscalYear: 2026, documentType: 'OC' }).subscribe();

    const req = http.expectOne(`${API_V1_PATH}/platform/document-sequences/next`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ companyId: 7, fiscalYear: 2026, documentType: 'OC' });
    req.flush({ number: 'OC-0001' });
  });
});
