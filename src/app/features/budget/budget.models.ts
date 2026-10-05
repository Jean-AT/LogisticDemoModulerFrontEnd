export interface BudgetAvailabilityQuery {
  companyId: number;
  fiscalYear: number;
  month: number;
  costCenterId: number;
  financingSourceId: number;
  goalId: number;
  expenseClassifierId: number;
  currency: string;
}

export interface BudgetAvailability {
  companyId?: number;
  fiscalYear?: number;
  month?: number;
  currency?: string;
  initial?: number;
  modified?: number;
  committed?: number;
  available?: number;
  raw: unknown;
}

export interface BudgetPlanActionRequest {
  companyId: number;
  fiscalYear: number;
  notes?: string;
}

export interface BudgetControlRequest {
  companyId: number;
  fiscalYear: number;
  month: number;
  costCenterId: number;
  financingSourceId: number;
  goalId: number;
  expenseClassifierId: number;
  currency: string;
  amount: number;
  sourceDocumentType: string;
  sourceDocumentId: string;
  reason?: string;
}

export interface BudgetControlReleaseRequest {
  reason: string;
}

export interface BudgetOperationResult {
  id?: number;
  status?: string;
  message?: string;
  raw: unknown;
}
