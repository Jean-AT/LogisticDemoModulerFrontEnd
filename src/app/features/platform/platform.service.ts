import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiClient } from '../../core/api-client.service';
import { CompanyContext } from '../../core/workspace-context.service';
import {
  PlatformCatalogEntry,
  PlatformCatalogKind,
  PlatformDocumentSequenceNextRequest,
  PlatformDocumentSequenceRequest,
  PlatformFiscalPeriod,
  PlatformUserAccess,
} from './platform.models';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly api = inject(ApiClient);

  listCompanies(): Observable<CompanyContext[]> {
    return this.api
      .get<unknown[]>('/platform/catalog/companies')
      .pipe(map((items) => items.map((item) => toCompanyContext(item))));
  }

  getCompany(companyId: number): Observable<PlatformCatalogEntry> {
    return this.api.get<unknown>(`/platform/catalog/companies/${companyId}`).pipe(map((item) => toCatalogEntry(item)));
  }

  listCatalog(kind: PlatformCatalogKind, companyId: number | null, fiscalYear: number): Observable<PlatformCatalogEntry[]> {
    return this.api
      .get<unknown[]>(catalogPath(kind), {
        params: catalogParams(kind, companyId, fiscalYear),
      })
      .pipe(map((items) => items.map((item) => toCatalogEntry(item))));
  }

  getItem(itemCode: string, companyId: number | null): Observable<PlatformCatalogEntry> {
    return this.api
      .get<unknown>(`/platform/catalog/items/${encodeURIComponent(itemCode)}`, { params: { companyId } })
      .pipe(map((item) => toCatalogEntry(item)));
  }

  getCurrency(currencyCode: string): Observable<PlatformCatalogEntry> {
    return this.api
      .get<unknown>(`/platform/catalog/currencies/${encodeURIComponent(currencyCode)}`)
      .pipe(map((item) => toCatalogEntry(item)));
  }

  getUnit(unitCode: string): Observable<PlatformCatalogEntry> {
    return this.api
      .get<unknown>(`/platform/catalog/units/${encodeURIComponent(unitCode)}`)
      .pipe(map((item) => toCatalogEntry(item)));
  }

  getUserAccess(username: string): Observable<PlatformUserAccess> {
    return this.api
      .get<unknown>(`/platform/security/users/${encodeURIComponent(username)}/access`)
      .pipe(map((raw) => ({ username, raw })));
  }

  getFiscalPeriod(companyId: number, fiscalYear: number, month: number): Observable<PlatformFiscalPeriod> {
    return this.api
      .get<unknown>('/platform/fiscal-periods', { params: { companyId, fiscalYear, month } })
      .pipe(map((raw) => toFiscalPeriod(raw, companyId, fiscalYear, month)));
  }

  saveFiscalPeriod(payload: unknown): Observable<PlatformFiscalPeriod> {
    return this.api.put<unknown>('/platform/fiscal-periods', payload).pipe(
      map((raw) => {
        const record = asRecord(raw);
        return toFiscalPeriod(
          raw,
          Number(record['companyId'] ?? 0),
          Number(record['fiscalYear'] ?? 0),
          Number(record['month'] ?? 0),
        );
      }),
    );
  }

  openFiscalPeriod(companyId: number, fiscalYear: number, month: number): Observable<PlatformFiscalPeriod> {
    return this.api
      .post<unknown>(`/platform/fiscal-periods/${companyId}/${fiscalYear}/${month}/open`, {})
      .pipe(map((raw) => toFiscalPeriod(raw, companyId, fiscalYear, month)));
  }

  closeFiscalPeriod(companyId: number, fiscalYear: number, month: number): Observable<PlatformFiscalPeriod> {
    return this.api
      .post<unknown>(`/platform/fiscal-periods/${companyId}/${fiscalYear}/${month}/close`, {})
      .pipe(map((raw) => toFiscalPeriod(raw, companyId, fiscalYear, month)));
  }

  saveDocumentSequence(payload: PlatformDocumentSequenceRequest): Observable<unknown> {
    return this.api.put<unknown>('/platform/document-sequences', payload);
  }

  nextDocumentSequence(payload: PlatformDocumentSequenceNextRequest): Observable<unknown> {
    return this.api.post<unknown>('/platform/document-sequences/next', payload);
  }
}

function catalogPath(kind: PlatformCatalogKind): string {
  const paths: Record<PlatformCatalogKind, string> = {
    companies: '/platform/catalog/companies',
    costCenters: '/platform/catalog/cost-centers',
    financingSources: '/platform/catalog/financing-sources',
    goals: '/platform/catalog/goals',
    expenseClassifiers: '/platform/catalog/expense-classifiers',
    items: '/platform/catalog/items',
  };
  return paths[kind];
}

function catalogParams(
  kind: PlatformCatalogKind,
  companyId: number | null,
  fiscalYear: number,
): Record<string, string | number | null> {
  if (kind === 'companies') return {};
  return kind === 'goals' ? { companyId, fiscalYear } : { companyId };
}

function toCompanyContext(raw: unknown): CompanyContext {
  const record = asRecord(raw);
  return {
    id: toNullableNumber(record['id'] ?? record['companyId']),
    code: String(record['code'] ?? record['companyCode'] ?? record['ruc'] ?? record['id'] ?? ''),
    name: String(record['name'] ?? record['companyName'] ?? record['razonSocial'] ?? record['code'] ?? 'Compania'),
  };
}

function toCatalogEntry(raw: unknown): PlatformCatalogEntry {
  const record = asRecord(raw);
  return {
    id: toNullableNumber(record['id']) ?? toNullableString(record['id'] ?? record['code']) ?? null,
    code: String(record['code'] ?? record['codigo'] ?? record['itemCode'] ?? record['currencyCode'] ?? record['unitCode'] ?? ''),
    name: String(record['name'] ?? record['nombre'] ?? record['description'] ?? record['label'] ?? record['code'] ?? 'Registro'),
    description: toNullableString(record['description'] ?? record['descripcion']),
    raw,
  };
}

function toFiscalPeriod(raw: unknown, companyId: number, fiscalYear: number, month: number): PlatformFiscalPeriod {
  const record = asRecord(raw);
  return {
    companyId: Number(record['companyId'] ?? companyId),
    fiscalYear: Number(record['fiscalYear'] ?? fiscalYear),
    month: Number(record['month'] ?? month),
    status: toNullableString(record['status'] ?? record['estado']),
    open: typeof record['open'] === 'boolean' ? record['open'] : undefined,
    raw,
  };
}

function toNullableNumber(value: unknown): number | null {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function toNullableString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
