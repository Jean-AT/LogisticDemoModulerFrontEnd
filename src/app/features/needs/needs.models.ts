export type NeedsPlanStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'OBSERVED' | 'REJECTED' | 'TRANSFERRED' | string;

export interface MonthlyQuantity {
  month: number;
  requestedQuantity?: number;
  reviewedQuantity?: number;
  approvedQuantity?: number;
}

export interface NeedsPlanLine {
  id?: number;
  itemCode?: string;
  itemName?: string;
  unitCode?: string;
  costCenterId?: number;
  costCenterCode?: string;
  financingSourceId?: number;
  financingSourceCode?: string;
  goalId?: number;
  goalCode?: string;
  expenseClassifierId?: number;
  expenseClassifierCode?: string;
  requestedTotal?: number;
  reviewedTotal?: number;
  approvedTotal?: number;
  months?: MonthlyQuantity[];
  raw?: unknown;
}

export interface NeedsPlan {
  id: number;
  number?: string;
  companyId?: number;
  fiscalYear?: number;
  status: NeedsPlanStatus;
  description?: string;
  requester?: string;
  createdAt?: string;
  updatedAt?: string;
  details: NeedsPlanLine[];
  raw: unknown;
}

export interface NeedsPlanFilters {
  companyId: number | null;
  fiscalYear: number;
  status?: string;
  page?: number;
  size?: number;
}

export interface NeedsPlanCreateRequest {
  companyId: number;
  fiscalYear: number;
  description?: string;
  details: NeedsPlanDetailRequest[];
}

export interface NeedsPlanDetailRequest {
  itemCode: string;
  unitCode: string;
  costCenterId: number;
  financingSourceId: number;
  goalId: number;
  expenseClassifierId: number;
  monthlyQuantities: NeedsPlanMonthlyQuantityRequest[];
}

export interface NeedsPlanMonthlyQuantityRequest {
  month: number;
  requestedQuantity: number;
}

export interface NeedsPlanReviewRequest {
  comment?: string;
  details?: unknown[];
}

export interface NeedsPlanDecisionRequest {
  comment?: string;
}

export interface NeedsConsolidationFilters {
  companyId: number | null;
  fiscalYear: number;
  page?: number;
  size?: number;
}

export interface NeedsConsolidation {
  id: number;
  number?: string;
  companyId?: number;
  fiscalYear?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  sources: NeedsConsolidationSource[];
  lines: NeedsConsolidationLine[];
  raw: unknown;
}

export interface NeedsConsolidationSource {
  planId?: number;
  planNumber?: string;
  status?: string;
}

export interface NeedsConsolidationLine {
  id?: number;
  itemCode?: string;
  itemName?: string;
  unitCode?: string;
  costCenterCode?: string;
  financingSourceCode?: string;
  goalCode?: string;
  expenseClassifierCode?: string;
  totalQuantity?: number;
  monthlyQuantities?: MonthlyQuantity[];
  raw?: unknown;
}

export interface NeedsBalance {
  lineId: number;
  total?: number;
  available?: number;
  consumed?: number;
  months: MonthlyQuantity[];
  raw: unknown;
}
