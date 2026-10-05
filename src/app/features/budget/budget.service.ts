import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../core/api-client.service';
import {
  BudgetAvailability,
  BudgetAvailabilityQuery,
  BudgetControlReleaseRequest,
  BudgetControlRequest,
  BudgetOperationResult,
  BudgetPlanActionRequest,
} from './budget.models';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly api = inject(ApiClient);

  generatePia(request: BudgetPlanActionRequest): Observable<BudgetOperationResult> {
    return this.api.post<unknown>('/budget/plans/pia/generate', request).pipe(map((raw) => toOperationResult(raw)));
  }

  reviewPia(request: BudgetPlanActionRequest): Observable<BudgetOperationResult> {
    return this.api.post<unknown>('/budget/plans/pia/review', request).pipe(map((raw) => toOperationResult(raw)));
  }

  approvePia(request: BudgetPlanActionRequest): Observable<BudgetOperationResult> {
    return this.api.post<unknown>('/budget/plans/pia/approve', request).pipe(map((raw) => toOperationResult(raw)));
  }

  getAvailability(query: BudgetAvailabilityQuery): Observable<BudgetAvailability> {
    return this.api
      .get<unknown>('/budget/availability', {
        params: {
          companyId: query.companyId,
          fiscalYear: query.fiscalYear,
          month: query.month,
          costCenterId: query.costCenterId,
          financingSourceId: query.financingSourceId,
          goalId: query.goalId,
          expenseClassifierId: query.expenseClassifierId,
          currency: query.currency,
        },
      })
      .pipe(map((raw) => toAvailability(raw)));
  }

  precommit(request: BudgetControlRequest, idempotencyKey: string): Observable<BudgetOperationResult> {
    return this.api
      .post<unknown>('/budget/controls/precommit', request, { idempotencyKey })
      .pipe(map((raw) => toOperationResult(raw)));
  }

  commit(controlId: number, request: Partial<BudgetControlRequest>, idempotencyKey: string): Observable<BudgetOperationResult> {
    return this.api
      .post<unknown>(`/budget/controls/${controlId}/commit`, request, { idempotencyKey })
      .pipe(map((raw) => toOperationResult(raw)));
  }

  release(controlId: number, request: BudgetControlReleaseRequest, idempotencyKey: string): Observable<BudgetOperationResult> {
    return this.api
      .post<unknown>(`/budget/controls/${controlId}/release`, request, { idempotencyKey })
      .pipe(map((raw) => toOperationResult(raw)));
  }
}

function toAvailability(raw: unknown): BudgetAvailability {
  const record = asRecord(raw);
  return {
    companyId: readNumber(record['companyId']),
    fiscalYear: readNumber(record['fiscalYear']),
    month: readNumber(record['month']),
    currency: readString(record['currency']),
    initial: readNumber(record['initial'] ?? record['pia']),
    modified: readNumber(record['modified'] ?? record['pim']),
    committed: readNumber(record['committed'] ?? record['comprometido']),
    available: readNumber(record['available'] ?? record['disponible']),
    raw,
  };
}

function toOperationResult(raw: unknown): BudgetOperationResult {
  const record = asRecord(raw);
  return {
    id: readNumber(record['id'] ?? record['controlId'] ?? record['planId']),
    status: readString(record['status'] ?? record['estado']),
    message: readString(record['message'] ?? record['detail']),
    raw,
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
