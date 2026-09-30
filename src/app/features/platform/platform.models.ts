export interface PlatformCatalogEntry {
  id: number | string | null;
  code: string;
  name: string;
  description?: string;
  raw: unknown;
}

export interface PlatformFiscalPeriod {
  companyId: number;
  fiscalYear: number;
  month: number;
  status?: string;
  open?: boolean;
  raw: unknown;
}

export interface PlatformDocumentSequenceRequest {
  companyId: number;
  fiscalYear: number;
  documentType: string;
  prefix: string;
  nextValue: number;
}

export interface PlatformDocumentSequenceNextRequest {
  companyId: number;
  fiscalYear: number;
  documentType: string;
}

export interface PlatformUserAccess {
  username: string;
  raw: unknown;
}

export type PlatformCatalogKind =
  | 'companies'
  | 'costCenters'
  | 'financingSources'
  | 'goals'
  | 'expenseClassifiers'
  | 'items';
