import { WorkspaceContextService } from './workspace-context.service';

describe('WorkspaceContextService', () => {
  beforeEach(() => localStorage.clear());

  it('starts with the institutional company and current fiscal year', () => {
    const context = new WorkspaceContextService();

    expect(context.company().name).toBe('Beneficencia de Lima');
    expect(context.fiscalYear()).toBe(new Date().getFullYear());
  });

  it('persists valid company and fiscal-year selections', () => {
    const context = new WorkspaceContextService();
    const nextYear = new Date().getFullYear() + 1;

    context.setCompanies([
      { id: 10, code: 'SBLM', name: 'Beneficencia de Lima' },
      { id: 20, code: 'DEMO', name: 'Compania demo' },
    ]);
    context.selectCompany(20);
    context.selectFiscalYear(nextYear);

    const restored = new WorkspaceContextService();
    restored.setCompanies([
      { id: 10, code: 'SBLM', name: 'Beneficencia de Lima' },
      { id: 20, code: 'DEMO', name: 'Compania demo' },
    ]);

    expect(restored.companyId()).toBe(20);
    expect(restored.fiscalYear()).toBe(nextYear);
  });
});
