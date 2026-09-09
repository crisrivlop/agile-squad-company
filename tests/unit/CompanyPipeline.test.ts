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
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'R&D spike' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'PO spec' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Arch design' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Backend code' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Frontend code' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Integration report' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'QA test suite' } });

    const company = new CompanyOrchestrator({
      includeRoles: ['rnd_lead', 'product_owner', 'tech_architect', 'backend_developer', 'frontend_developer', 'repo_integrator', 'qa_lead']
    });

    const pipelineRes = await company.runParallelDevPipeline('Nueva pasarela de pago');

    expect(pipelineRes['0_rnd_lead']).toBe('R&D spike');
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

  it('should run pipeline gracefully even if some roles are missing from squad', async () => {
    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Backend code only' } })
      .mockResolvedValueOnce({ message: { role: 'assistant', content: 'Frontend code only' } });

    // Instantiating with ONLY devs (no PO, no Arch, no Integrator, no QA)
    const partialCompany = new CompanyOrchestrator({
      includeRoles: ['backend_developer', 'frontend_developer']
    });

    const res = await partialCompany.runParallelDevPipeline('Feature sin PO ni QA');
    expect(res['3_backend_developer']).toBe('Backend code only');
    expect(res['3_frontend_developer']).toBe('Frontend code only');
    expect(res['1_product_owner']).toBeUndefined();
    expect(res['2_tech_architect']).toBeUndefined();
  });

  it('should accept custom workers in options', () => {
    const company = new CompanyOrchestrator({
      customWorkers: [
        {
          roleId: 'custom_secops',
          name: 'Custom SecOps Specialist',
          defaultModel: 'qwen2.5-coder:latest',
          requiredSkills: [],
          systemPromptBase: 'Base SecOps'
        }
      ]
    });

    expect(company.getWorker('custom_secops')).toBeDefined();
  });

  it('should fallback to empty string if parallel dev outputs are undefined', async () => {
    const company = new CompanyOrchestrator({
      includeRoles: ['backend_developer', 'frontend_developer']
    });

    // Mock executeInParallel to return empty array
    jest.spyOn(company, 'executeInParallel').mockResolvedValueOnce([]);

    const res = await company.runParallelDevPipeline('Test empty parallel output');
    expect(res['3_backend_developer']).toBe('');
    expect(res['3_frontend_developer']).toBe('');
  });

  it('should dynamically configure Gemini on a specific worker role or all workers at any moment', () => {
    const company = new CompanyOrchestrator();

    // 1. Configure single worker
    const ok = company.configureWorkerGemini('tech_architect', { apiKey: 'key_123', model: 'gemini-2.5-pro' });
    expect(ok).toBe(true);
    expect(company.getWorker('tech_architect')?.config.provider).toBe('gemini');
    expect(company.getWorker('tech_architect')?.config.defaultModel).toBe('gemini-2.5-pro');

    // Return false for non-existent role
    const failed = company.configureWorkerGemini('ghost_role', { apiKey: 'key_123' });
    expect(failed).toBe(false);

    // 2. Configure all squad workers simultaneously
    company.configureAllWorkersGemini({ apiKey: 'global_gemini_key', model: 'gemini-2.5-flash' });
    for (const workerId of company.listWorkers()) {
      expect(company.getWorker(workerId)?.config.provider).toBe('gemini');
      expect(company.getWorker(workerId)?.config.defaultModel).toBe('gemini-2.5-flash');
    }
  });

  it('should update workspaceRoot and propagate to all workers on setWorkspaceRoot', () => {
    const company = new CompanyOrchestrator({ workspaceRoot: 'C:/init/path', enableMcpTools: true });
    expect(company.getWorkspaceRoot()).toBe('C:/init/path');
    const worker = company.getWorker('lead_developer');
    expect(worker?.getWorkspaceRoot()).toBe('C:/init/path');
    expect(worker?.getSystemPrompt()).toContain('C:/init/path');

    company.setWorkspaceRoot('C:/updated/path');
    expect(company.getWorkspaceRoot()).toBe('C:/updated/path');
    expect(worker?.getWorkspaceRoot()).toBe('C:/updated/path');
    expect(worker?.getSystemPrompt()).toContain('C:/updated/path');
  });
});
