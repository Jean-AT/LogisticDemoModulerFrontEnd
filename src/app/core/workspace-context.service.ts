import { Injectable, computed, signal } from '@angular/core';

export interface CompanyContext {
  id: number | null;
  code: string;
  name: string;
}

const CONTEXT_KEY = 'erp.workspace-context';
const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_COMPANY: CompanyContext = {
  id: null,
  code: 'SBLM',
  name: 'Beneficencia de Lima',
};

@Injectable({ providedIn: 'root' })
export class WorkspaceContextService {
  private readonly stored = readContext();
  private readonly companiesSignal = signal<CompanyContext[]>([DEFAULT_COMPANY]);
  private readonly companyIdSignal = signal<number | null>(this.stored.companyId);
  private readonly fiscalYearSignal = signal<number>(this.stored.fiscalYear);

  readonly companies = this.companiesSignal.asReadonly();
  readonly companyId = this.companyIdSignal.asReadonly();
  readonly fiscalYear = this.fiscalYearSignal.asReadonly();
  readonly fiscalYears = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
  readonly company = computed(
    () => this.companiesSignal().find((company) => company.id === this.companyIdSignal()) ?? this.companiesSignal()[0],
  );

  setCompanies(companies: CompanyContext[]): void {
    const nextCompanies = companies.length > 0 ? companies : [DEFAULT_COMPANY];
    this.companiesSignal.set(nextCompanies);

    if (!nextCompanies.some((company) => company.id === this.companyIdSignal())) {
      this.companyIdSignal.set(nextCompanies[0].id);
    }
    this.persist();
  }

  selectCompany(companyId: number | null): void {
    if (!this.companiesSignal().some((company) => company.id === companyId)) {
      return;
    }
    this.companyIdSignal.set(companyId);
    this.persist();
  }

  selectFiscalYear(fiscalYear: number): void {
    if (!this.fiscalYears.includes(fiscalYear)) {
      return;
    }
    this.fiscalYearSignal.set(fiscalYear);
    this.persist();
  }

  private persist(): void {
    safeStorage(() =>
      localStorage.setItem(
        CONTEXT_KEY,
        JSON.stringify({ companyId: this.companyIdSignal(), fiscalYear: this.fiscalYearSignal() }),
      ),
    );
  }
}

function readContext(): { companyId: number | null; fiscalYear: number } {
  try {
    const stored = JSON.parse(localStorage.getItem(CONTEXT_KEY) ?? '{}') as {
      companyId?: unknown;
      fiscalYear?: unknown;
    };
    return {
      companyId: typeof stored.companyId === 'number' ? stored.companyId : null,
      fiscalYear:
        typeof stored.fiscalYear === 'number' && Math.abs(stored.fiscalYear - CURRENT_YEAR) <= 1
          ? stored.fiscalYear
          : CURRENT_YEAR,
    };
  } catch {
    return { companyId: null, fiscalYear: CURRENT_YEAR };
  }
}

function safeStorage(action: () => void): void {
  try {
    action();
  } catch {
    // Context persistence is optional when browser storage is unavailable.
  }
}
