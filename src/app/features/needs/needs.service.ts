import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../core/api-client.service';
import { PageResponse } from '../../core/models';
import {
  MonthlyQuantity,
  NeedsBalance,
  NeedsConsolidation,
  NeedsConsolidationFilters,
  NeedsConsolidationLine,
  NeedsConsolidationSource,
  NeedsPlan,
  NeedsPlanCreateRequest,
  NeedsPlanDecisionRequest,
  NeedsPlanDetailRequest,
  NeedsPlanFilters,
  NeedsPlanLine,
  NeedsPlanReviewRequest,
} from './needs.models';

@Injectable({ providedIn: 'root' })
export class NeedsService {
  private readonly api = inject(ApiClient);

  listPlans(filters: NeedsPlanFilters): Observable<PageResponse<NeedsPlan>> {
    return this.api
      .getPage<unknown>('/needs/plans', {
        params: {
          companyId: filters.companyId,
          fiscalYear: filters.fiscalYear,
          status: filters.status,
          page: filters.page ?? 0,
          size: filters.size ?? 10,
        },
      })
      .pipe(map((page) => ({ ...page, content: page.content.map((item) => toNeedsPlan(item)) })));
  }

  getPlan(id: number): Observable<NeedsPlan> {
    return this.api.get<unknown>(`/needs/plans/${id}`).pipe(map((item) => toNeedsPlan(item)));
  }

  createPlan(request: NeedsPlanCreateRequest): Observable<NeedsPlan> {
    return this.api.post<unknown>('/needs/plans', request).pipe(map((item) => toNeedsPlan(item)));
  }

  replaceDetails(id: number, details: NeedsPlanDetailRequest[]): Observable<NeedsPlan> {
    return this.api.put<unknown>(`/needs/plans/${id}/details`, details).pipe(map((item) => toNeedsPlan(item)));
  }

  submitPlan(id: number): Observable<NeedsPlan> {
    return this.api.post<unknown>(`/needs/plans/${id}/submit`, {}).pipe(map((item) => toNeedsPlan(item)));
  }

  reviewPlan(id: number, request: NeedsPlanReviewRequest): Observable<NeedsPlan> {
    return this.api.post<unknown>(`/needs/plans/${id}/review`, request).pipe(map((item) => toNeedsPlan(item)));
  }

  observePlan(id: number, request: NeedsPlanDecisionRequest): Observable<NeedsPlan> {
    return this.api.post<unknown>(`/needs/plans/${id}/observe`, request).pipe(map((item) => toNeedsPlan(item)));
  }

  rejectPlan(id: number, request: NeedsPlanDecisionRequest): Observable<NeedsPlan> {
    return this.api.post<unknown>(`/needs/plans/${id}/reject`, request).pipe(map((item) => toNeedsPlan(item)));
  }

  listConsolidations(filters: NeedsConsolidationFilters): Observable<PageResponse<NeedsConsolidation>> {
    return this.api
      .getPage<unknown>('/needs/consolidations', {
        params: {
          companyId: filters.companyId,
          fiscalYear: filters.fiscalYear,
          page: filters.page ?? 0,
          size: filters.size ?? 10,
        },
      })
      .pipe(map((page) => ({ ...page, content: page.content.map((item) => toNeedsConsolidation(item)) })));
  }

  getConsolidation(id: number): Observable<NeedsConsolidation> {
    return this.api.get<unknown>(`/needs/consolidations/${id}`).pipe(map((item) => toNeedsConsolidation(item)));
  }

  createConsolidation(companyId: number, fiscalYear: number): Observable<NeedsConsolidation> {
    return this.api
      .post<unknown>('/needs/consolidations', {}, { params: { companyId, fiscalYear } })
      .pipe(map((item) => toNeedsConsolidation(item)));
  }

  reverseConsolidation(id: number): Observable<NeedsConsolidation> {
    return this.api.post<unknown>(`/needs/consolidations/${id}/reverse`, {}).pipe(map((item) => toNeedsConsolidation(item)));
  }

  transferConsolidation(id: number, idempotencyKey: string): Observable<NeedsConsolidation> {
    return this.api
      .post<unknown>(`/needs/consolidations/${id}/transfer`, {}, { idempotencyKey })
      .pipe(map((item) => toNeedsConsolidation(item)));
  }

  getBalance(lineId: number, companyId: number | null): Observable<NeedsBalance> {
    return this.api
      .get<unknown>(`/needs/balances/${lineId}`, { params: { companyId } })
      .pipe(map((item) => toNeedsBalance(item, lineId)));
  }

  getPlanTraceability(id: number): Observable<unknown> {
    return this.api.get<unknown>(`/needs/traceability/plans/${id}`);
  }
}

function toNeedsPlan(raw: unknown): NeedsPlan {
  const record = asRecord(raw);
  const detailsRaw = readArray(record['details'] ?? record['lineas'] ?? record['lines']);
  return {
    id: Number(record['id'] ?? 0),
    number: readString(record['number'] ?? record['numero'] ?? record['code']),
    companyId: readNumber(record['companyId']),
    fiscalYear: readNumber(record['fiscalYear']),
    status: String(record['status'] ?? record['estado'] ?? 'DRAFT'),
    description: readString(record['description'] ?? record['descripcion']),
    requester: readString(record['requester'] ?? record['createdBy'] ?? record['usuario']),
    createdAt: readString(record['createdAt']),
    updatedAt: readString(record['updatedAt']),
    details: detailsRaw.map((item) => toNeedsPlanLine(item)),
    raw,
  };
}

function toNeedsPlanLine(raw: unknown): NeedsPlanLine {
  const record = asRecord(raw);
  const monthsRaw = readArray(record['months'] ?? record['monthlyQuantities'] ?? record['meses']);
  return {
    id: readNumber(record['id']),
    itemCode: readString(record['itemCode'] ?? record['codigoItem']),
    itemName: readString(record['itemName'] ?? record['nombreItem'] ?? record['description']),
    unitCode: readString(record['unitCode'] ?? record['unidad']),
    costCenterId: readNumber(record['costCenterId']),
    costCenterCode: readString(record['costCenterCode']),
    financingSourceId: readNumber(record['financingSourceId']),
    financingSourceCode: readString(record['financingSourceCode']),
    goalId: readNumber(record['goalId']),
    goalCode: readString(record['goalCode']),
    expenseClassifierId: readNumber(record['expenseClassifierId']),
    expenseClassifierCode: readString(record['expenseClassifierCode']),
    requestedTotal: readNumber(record['requestedTotal'] ?? record['totalRequested'] ?? record['totalSolicitado']),
    reviewedTotal: readNumber(record['reviewedTotal'] ?? record['totalReviewed']),
    approvedTotal: readNumber(record['approvedTotal'] ?? record['totalApproved']),
    months: monthsRaw.map((item) => toMonthlyQuantity(item)),
    raw,
  };
}

function toMonthlyQuantity(raw: unknown): MonthlyQuantity {
  const record = asRecord(raw);
  return {
    month: Number(record['month'] ?? record['mes'] ?? 0),
    requestedQuantity: readNumber(record['requestedQuantity'] ?? record['cantidadSolicitada']),
    reviewedQuantity: readNumber(record['reviewedQuantity'] ?? record['cantidadRevisada']),
    approvedQuantity: readNumber(record['approvedQuantity'] ?? record['cantidadAprobada']),
  };
}

function toNeedsConsolidation(raw: unknown): NeedsConsolidation {
  const record = asRecord(raw);
  const sourcesRaw = readArray(record['sources'] ?? record['fuentes'] ?? record['plans']);
  const linesRaw = readArray(record['lines'] ?? record['details'] ?? record['lineas']);
  return {
    id: Number(record['id'] ?? 0),
    number: readString(record['number'] ?? record['numero'] ?? record['code']),
    companyId: readNumber(record['companyId']),
    fiscalYear: readNumber(record['fiscalYear']),
    status: readString(record['status'] ?? record['estado']),
    createdAt: readString(record['createdAt']),
    updatedAt: readString(record['updatedAt']),
    sources: sourcesRaw.map((item) => toConsolidationSource(item)),
    lines: linesRaw.map((item) => toConsolidationLine(item)),
    raw,
  };
}

function toConsolidationSource(raw: unknown): NeedsConsolidationSource {
  const record = asRecord(raw);
  return {
    planId: readNumber(record['planId'] ?? record['needsPlanId'] ?? record['id']),
    planNumber: readString(record['planNumber'] ?? record['number'] ?? record['numero']),
    status: readString(record['status'] ?? record['estado']),
  };
}

function toConsolidationLine(raw: unknown): NeedsConsolidationLine {
  const record = asRecord(raw);
  const monthsRaw = readArray(record['months'] ?? record['monthlyQuantities'] ?? record['meses']);
  return {
    id: readNumber(record['id'] ?? record['lineId']),
    itemCode: readString(record['itemCode'] ?? record['codigoItem']),
    itemName: readString(record['itemName'] ?? record['nombreItem'] ?? record['description']),
    unitCode: readString(record['unitCode'] ?? record['unidad']),
    costCenterCode: readString(record['costCenterCode']),
    financingSourceCode: readString(record['financingSourceCode']),
    goalCode: readString(record['goalCode']),
    expenseClassifierCode: readString(record['expenseClassifierCode']),
    totalQuantity: readNumber(record['totalQuantity'] ?? record['total'] ?? record['approvedTotal']),
    monthlyQuantities: monthsRaw.map((item) => toMonthlyQuantity(item)),
    raw,
  };
}

function toNeedsBalance(raw: unknown, lineId: number): NeedsBalance {
  const record = asRecord(raw);
  const monthsRaw = readArray(record['months'] ?? record['monthlyBalances'] ?? record['meses']);
  return {
    lineId: Number(record['lineId'] ?? lineId),
    total: readNumber(record['total']),
    available: readNumber(record['available'] ?? record['saldoDisponible']),
    consumed: readNumber(record['consumed'] ?? record['cantidadConsumida']),
    months: monthsRaw.map((item) => toMonthlyQuantity(item)),
    raw,
  };
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
