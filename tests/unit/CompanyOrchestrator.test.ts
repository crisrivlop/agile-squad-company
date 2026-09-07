import { CompanyOrchestrator } from '../../src/CompanyOrchestrator';

describe('CompanyOrchestrator Squad Configuration (Unit Tests)', () => {
  it('should register full squad by default when no filter is provided', () => {
    const company = new CompanyOrchestrator();
    const workers = company.listWorkers();

    expect(workers.length).toBeGreaterThanOrEqual(8);
    expect(workers).toContain('product_owner');
    expect(workers).toContain('tech_architect');
    expect(workers).toContain('lead_developer');
    expect(workers).toContain('branch_manager');
    expect(workers).toContain('repo_integrator');
    expect(workers).toContain('qa_lead');
    expect(workers).toContain('appsec_lead');
    expect(workers).toContain('rnd_lead');
  });

  it('should filter only requested roles when includeRoles is specified', () => {
    const company = new CompanyOrchestrator({
      includeRoles: ['backend_developer', 'frontend_developer', 'repo_integrator']
    });
    const workers = company.listWorkers();

    expect(workers).toHaveLength(3);
    expect(workers).toContain('backend_developer');
    expect(workers).toContain('frontend_developer');
    expect(workers).toContain('repo_integrator');
    expect(workers).not.toContain('product_owner');
  });

  it('should return undefined for unregistered worker roles', () => {
    const company = new CompanyOrchestrator({
      includeRoles: ['qa_lead']
    });

    expect(company.getWorker('qa_lead')).toBeDefined();
    expect(company.getWorker('backend_developer')).toBeUndefined();
  });
});
