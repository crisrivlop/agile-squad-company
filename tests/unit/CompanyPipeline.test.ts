import { CompanyOrchestrator } from '../../src/CompanyOrchestrator';
import ollama from 'ollama';

jest.mock('ollama');

describe('CompanyOrchestrator Pipelines & Parallel Dispatch (Unit Tests)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute tasks in parallel using executeInParallel', async () => {
    (ollama.chat as jest.Mock).mockResolvedValue({
      message: { role: 'assistant', content: 'Respuesta paralela mock' }
    });

    const company = new CompanyOrchestrator({
      includeRoles: ['backend_developer', 'frontend_developer']
    });

    const tasks = [
      { roleId: 'backend_developer', prompt: 'Tarea 1' },
      { roleId: 'frontend_developer', prompt: 'Tarea 2' },
      { roleId: 'non_existent_role', prompt: 'Tarea 3' }
    ];

    const results = await company.executeInParallel(tasks);

    expect(results).toHaveLength(3);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(true);
    expect(results[2].success).toBe(false);
    expect(results[2].output).toContain('not active in the current squad');
  });

  it('should run full parallel dev pipeline', async () => {
    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'PO spec' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Arch design' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Backend code' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Frontend code' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Integration report' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'QA test suite' } });

    const company = new CompanyOrchestrator({
      includeRoles: ['product_owner', 'tech_architect', 'backend_developer', 'frontend_developer', 'repo_integrator', 'qa_lead']
    });

    const pipelineRes = await company.runParallelDevPipeline('Nueva pasarela de pago');

    expect(pipelineRes['1_product_owner']).toBe('PO spec');
    expect(pipelineRes['2_tech_architect']).toBe('Arch design');
    expect(pipelineRes['4_repo_integrator']).toBe('Integration report');
    expect(pipelineRes['5_qa_lead']).toBe('QA test suite');
  });

  it('should enable MCP tools when enableMcpTools is true in options', () => {
    const company = new CompanyOrchestrator({
      enableMcpTools: true,
      workspaceRoot: 'C:\\test'
    });
    expect(company).toBeDefined();
  });
});
