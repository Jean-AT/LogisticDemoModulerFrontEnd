import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_V1_PATH } from '../../core/api.config';
import { NeedsService } from './needs.service';

describe('NeedsService', () => {
  let service: NeedsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NeedsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NeedsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists needs plans with company, fiscal year and pagination filters', () => {
    service.listPlans({ companyId: 7, fiscalYear: 2026, status: 'DRAFT', page: 1, size: 25 }).subscribe();

    const req = http.expectOne((request) => request.url === `${API_V1_PATH}/needs/plans`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('companyId')).toBe('7');
    expect(req.request.params.get('fiscalYear')).toBe('2026');
    expect(req.request.params.get('status')).toBe('DRAFT');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('25');
    req.flush({ content: [], page: 1, size: 25, totalElements: 0, totalPages: 0 });
  });

  it('gets a needs plan detail and maps lines defensively', () => {
    let detailCount = 0;
    service.getPlan(12).subscribe((plan) => (detailCount = plan.details.length));

    const req = http.expectOne(`${API_V1_PATH}/needs/plans/12`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 12, status: 'DRAFT', details: [{ itemCode: 'IT-1', monthlyQuantities: [{ month: 1, requestedQuantity: 3 }] }] });

    expect(detailCount).toBe(1);
  });

  it('exposes all current plan transitions', () => {
    service.submitPlan(12).subscribe();
    service.reviewPlan(12, { comment: 'ok' }).subscribe();
    service.observePlan(12, { comment: 'corregir' }).subscribe();
    service.rejectPlan(12, { comment: 'no procede' }).subscribe();

    const submit = http.expectOne(`${API_V1_PATH}/needs/plans/12/submit`);
    expect(submit.request.method).toBe('POST');
    submit.flush({ id: 12, status: 'SUBMITTED' });

    const review = http.expectOne(`${API_V1_PATH}/needs/plans/12/review`);
    expect(review.request.method).toBe('POST');
    expect(review.request.body).toEqual({ comment: 'ok' });
    review.flush({ id: 12, status: 'REVIEWED' });

    const observe = http.expectOne(`${API_V1_PATH}/needs/plans/12/observe`);
    expect(observe.request.method).toBe('POST');
    expect(observe.request.body).toEqual({ comment: 'corregir' });
    observe.flush({ id: 12, status: 'OBSERVED' });

    const reject = http.expectOne(`${API_V1_PATH}/needs/plans/12/reject`);
    expect(reject.request.method).toBe('POST');
    expect(reject.request.body).toEqual({ comment: 'no procede' });
    reject.flush({ id: 12, status: 'REJECTED' });
  });

  it('creates a plan and replaces details through the V2 endpoints', () => {
    const detail = {
      itemCode: 'IT-1',
      unitCode: 'UND',
      costCenterId: 1,
      financingSourceId: 2,
      goalId: 3,
      expenseClassifierId: 4,
      monthlyQuantities: [{ month: 1, requestedQuantity: 5 }],
    };
    service.createPlan({ companyId: 7, fiscalYear: 2026, description: 'Plan anual', details: [detail] }).subscribe();
    service.replaceDetails(12, [detail]).subscribe();

    const create = http.expectOne(`${API_V1_PATH}/needs/plans`);
    expect(create.request.method).toBe('POST');
    create.flush({ id: 12, status: 'DRAFT', details: [] });

    const replace = http.expectOne(`${API_V1_PATH}/needs/plans/12/details`);
    expect(replace.request.method).toBe('PUT');
    expect(replace.request.body).toEqual([detail]);
    replace.flush({ id: 12, status: 'DRAFT', details: [{ itemCode: 'IT-1' }] });
  });

  it('lists, creates and reads consolidations with context filters', () => {
    service.listConsolidations({ companyId: 7, fiscalYear: 2026, page: 0, size: 10 }).subscribe();
    service.createConsolidation(7, 2026).subscribe();
    service.getConsolidation(99).subscribe();

    const list = http.expectOne(
      (request) => request.url === `${API_V1_PATH}/needs/consolidations` && request.method === 'GET',
    );
    expect(list.request.method).toBe('GET');
    expect(list.request.params.get('companyId')).toBe('7');
    expect(list.request.params.get('fiscalYear')).toBe('2026');
    list.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });

    const create = http.expectOne(
      (request) => request.url === `${API_V1_PATH}/needs/consolidations` && request.method === 'POST',
    );
    expect(create.request.method).toBe('POST');
    expect(create.request.params.get('companyId')).toBe('7');
    expect(create.request.params.get('fiscalYear')).toBe('2026');
    create.flush({ id: 99, status: 'CREATED', lines: [] });

    const detail = http.expectOne(`${API_V1_PATH}/needs/consolidations/99`);
    expect(detail.request.method).toBe('GET');
    detail.flush({ id: 99, status: 'CREATED', lines: [{ id: 1, itemCode: 'IT-1' }] });
  });

  it('reverses and transfers consolidations with idempotency key', () => {
    service.reverseConsolidation(99).subscribe();
    service.transferConsolidation(99, 'idem-1').subscribe();

    const reverse = http.expectOne(`${API_V1_PATH}/needs/consolidations/99/reverse`);
    expect(reverse.request.method).toBe('POST');
    reverse.flush({ id: 99, status: 'REVERSED' });

    const transfer = http.expectOne(`${API_V1_PATH}/needs/consolidations/99/transfer`);
    expect(transfer.request.method).toBe('POST');
    expect(transfer.request.headers.get('Idempotency-Key')).toBe('idem-1');
    transfer.flush({ id: 99, status: 'TRANSFERRED' });
  });

  it('reads balances and plan traceability', () => {
    service.getBalance(123, 7).subscribe();
    service.getPlanTraceability(12).subscribe();

    const balance = http.expectOne((request) => request.url === `${API_V1_PATH}/needs/balances/123`);
    expect(balance.request.method).toBe('GET');
    expect(balance.request.params.get('companyId')).toBe('7');
    balance.flush({ lineId: 123, available: 8, months: [] });

    const traceability = http.expectOne(`${API_V1_PATH}/needs/traceability/plans/12`);
    expect(traceability.request.method).toBe('GET');
    traceability.flush({ events: [] });
  });
});
