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
