import * as indexExports from '../../src/index';

describe('Index Exports (Unit Test)', () => {
  it('should export all public classes and interfaces', () => {
    expect(indexExports.SkillRegistry).toBeDefined();
    expect(indexExports.AgentWorker).toBeDefined();
    expect(indexExports.CompanyOrchestrator).toBeDefined();
    expect(indexExports.McpClientManager).toBeDefined();
  });
});
