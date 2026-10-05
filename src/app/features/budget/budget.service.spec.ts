import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_V1_PATH } from '../../core/api.config';
import { BudgetControlRequest } from './budget.models';
import { BudgetService } from './budget.service';

describe('BudgetService', () => {
  let service: BudgetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BudgetService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BudgetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('runs PIA generation, review and approval actions', () => {
    const request = { companyId: 7, fiscalYear: 2026, notes: 'cerrar cuadro' };

    service.generatePia(request).subscribe((result) => expect(result.status).toBe('GENERATED'));
    service.reviewPia(request).subscribe((result) => expect(result.status).toBe('REVIEWED'));
    service.approvePia(request).subscribe((result) => expect(result.status).toBe('APPROVED'));

    const generate = http.expectOne(`${API_V1_PATH}/budget/plans/pia/generate`);
    expect(generate.request.method).toBe('POST');
    expect(generate.request.body).toEqual(request);
    generate.flush({ status: 'GENERATED' });

    const review = http.expectOne(`${API_V1_PATH}/budget/plans/pia/review`);
    expect(review.request.method).toBe('POST');
    expect(review.request.body).toEqual(request);
    review.flush({ status: 'REVIEWED' });

    const approve = http.expectOne(`${API_V1_PATH}/budget/plans/pia/approve`);
    expect(approve.request.method).toBe('POST');
    expect(approve.request.body).toEqual(request);
    approve.flush({ status: 'APPROVED' });
  });

  it('queries budget availability with all budget dimensions', () => {
    service
      .getAvailability({
        companyId: 7,
        fiscalYear: 2026,
        month: 10,
        costCenterId: 1,
        financingSourceId: 2,
        goalId: 3,
        expenseClassifierId: 4,
        currency: 'PEN',
      })
      .subscribe((availability) => {
        expect(availability.available).toBe(120);
        expect(availability.modified).toBe(500);
      });

    const req = http.expectOne((request) => request.url === `${API_V1_PATH}/budget/availability`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('companyId')).toBe('7');
    expect(req.request.params.get('fiscalYear')).toBe('2026');
    expect(req.request.params.get('month')).toBe('10');
    expect(req.request.params.get('costCenterId')).toBe('1');
    expect(req.request.params.get('financingSourceId')).toBe('2');
    expect(req.request.params.get('goalId')).toBe('3');
    expect(req.request.params.get('expenseClassifierId')).toBe('4');
    expect(req.request.params.get('currency')).toBe('PEN');
    req.flush({ pim: 500, disponible: 120 });
  });

  it('uses idempotency keys for manual budget controls', () => {
    const request: BudgetControlRequest = {
      companyId: 7,
      fiscalYear: 2026,
      month: 10,
      costCenterId: 1,
      financingSourceId: 2,
      goalId: 3,
      expenseClassifierId: 4,
      currency: 'PEN',
      amount: 100,
      sourceDocumentType: 'MANUAL',
      sourceDocumentId: 'REQ-1',
      reason: 'Reserva manual',
    };

    service.precommit(request, 'idem-pre').subscribe((result) => expect(result.id).toBe(22));
    service.commit(22, { reason: 'Commit manual' }, 'idem-commit').subscribe();
    service.release(22, { reason: 'Liberacion manual' }, 'idem-release').subscribe();

    const precommit = http.expectOne(`${API_V1_PATH}/budget/controls/precommit`);
    expect(precommit.request.method).toBe('POST');
    expect(precommit.request.body).toEqual(request);
    expect(precommit.request.headers.get('Idempotency-Key')).toBe('idem-pre');
    precommit.flush({ controlId: 22, status: 'PRECOMMITTED' });

    const commit = http.expectOne(`${API_V1_PATH}/budget/controls/22/commit`);
    expect(commit.request.method).toBe('POST');
    expect(commit.request.body).toEqual({ reason: 'Commit manual' });
    expect(commit.request.headers.get('Idempotency-Key')).toBe('idem-commit');
    commit.flush({ controlId: 22, status: 'COMMITTED' });

    const release = http.expectOne(`${API_V1_PATH}/budget/controls/22/release`);
    expect(release.request.method).toBe('POST');
    expect(release.request.body).toEqual({ reason: 'Liberacion manual' });
    expect(release.request.headers.get('Idempotency-Key')).toBe('idem-release');
    release.flush({ controlId: 22, status: 'RELEASED' });
  });
});
