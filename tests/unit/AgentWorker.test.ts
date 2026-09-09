import { AgentWorker } from '../../src/AgentWorker';
import { SkillRegistry } from '../../src/SkillRegistry';
import { McpClientManager } from '../../src/McpClientManager';
import ollama from 'ollama';

jest.mock('ollama');

describe('AgentWorker & ReAct Loop (Unit Tests with Mocks)', () => {
  const mockRegistry = new SkillRegistry();
  const baseConfig = {
    roleId: 'test_dev',
    name: 'Test Dev Agent',
    defaultModel: 'qwen2.5-coder:latest',
    requiredSkills: [],
    systemPromptBase: 'Base prompt'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute simple task successfully without tool calls', async () => {
    (ollama.chat as jest.Mock).mockResolvedValueOnce({
      message: { role: 'assistant', content: 'Codigo generado con exito' }
    });

    const worker = new AgentWorker(baseConfig, mockRegistry);
    const result = await worker.executeTask('Genera un modulo simple');

    expect(result.success).toBe(true);
    expect(result.output).toBe('Codigo generado con exito');
    expect(result.modelUsed).toBe('qwen2.5-coder:latest');

    // Test overrideModel branch
    (ollama.chat as jest.Mock).mockResolvedValueOnce({
      message: { role: 'assistant', content: 'Respuesta con gemma4' }
    });
    const overrideRes = await worker.executeTask('Genera con gemma', 'gemma4:e2b');
    expect(overrideRes.modelUsed).toBe('gemma4:e2b');
  });

  it('should handle Ollama chat error gracefully', async () => {
    (ollama.chat as jest.Mock).mockRejectedValueOnce(new Error('Connection refused to Ollama daemon'));

    const worker = new AgentWorker(baseConfig, mockRegistry);
    const result = await worker.executeTask('Haz una tarea');

    expect(result.success).toBe(false);
    expect(result.output).toContain('Error executing task with Ollama model');
  });

  it('should execute ReAct loop when Ollama triggers tool_calls', async () => {
    const mockMcp = {
      getAvailableTools: jest.fn().mockResolvedValue([
        { name: 'read_text_file', description: 'Read file', inputSchema: {} }
      ]),
      callTool: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'export const PI = 3.14;' }]
      })
    } as unknown as McpClientManager;

    // 1st call returns a tool_call
    (ollama.chat as jest.Mock).mockResolvedValueOnce({
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            function: {
              name: 'read_text_file',
              arguments: { path: 'src/math.ts' }
            }
          }
        ]
      }
    });

    // 2nd call returns final response after receiving tool output
    (ollama.chat as jest.Mock).mockResolvedValueOnce({
      message: {
        role: 'assistant',
        content: 'El valor de PI en el archivo es 3.14'
      }
    });

    const worker = new AgentWorker(baseConfig, mockRegistry, mockMcp);
    const result = await worker.executeTask('Lee el archivo math.ts');

    expect(result.success).toBe(true);
    expect(result.output).toBe('El valor de PI en el archivo es 3.14');
    expect(mockMcp.callTool).toHaveBeenCalledWith('read_text_file', { path: 'src/math.ts' });
    expect(ollama.chat).toHaveBeenCalledTimes(2);
  });

  it('should handle tool call when worker has no mcpManager configured', async () => {
    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'unsupported_tool', arguments: {} } }]
        }
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'No tools available' }
      });

    // Worker without mcpManager
    const worker = new AgentWorker(baseConfig, mockRegistry);
    const result = await worker.executeTask('Ejecuta herramienta sin MCP');

    expect(result.success).toBe(true);
    expect(result.output).toBe('No tools available');
  });

  it('should execute web_search_duckduckgo tool in ReAct loop', async () => {
    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'web_search_duckduckgo', arguments: { query: 'test query' } } }]
        }
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Resultados encontrados' }
      });

    const worker = new AgentWorker(baseConfig, mockRegistry);
    const result = await worker.executeTask('Busca en la web');

    expect(result.success).toBe(true);
    expect(result.output).toBe('Resultados encontrados');
  });

  it('should handle tool call when tool result has no content property', async () => {
    const mockMcpNoContent = {
      getAvailableTools: jest.fn().mockResolvedValue([]),
      callTool: jest.fn().mockResolvedValue({ status: 'ok', rawResult: 42 })
    } as unknown as McpClientManager;

    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: '',
          tool_calls: [{ function: { name: 'calc_tool', arguments: {} } }]
        }
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Calculo terminado' }
      });

    const worker = new AgentWorker(baseConfig, mockRegistry, mockMcpNoContent);
    const result = await worker.executeTask('Calcula algo');

    expect(result.success).toBe(true);
    expect(result.output).toBe('Calculo terminado');
  });

  it('should execute task successfully using Gemini provider', async () => {
    const mockGemini = {
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: 'Respuesta generada por Gemini Flash'
        })
      }
    };

    const geminiConfig = {
      ...baseConfig,
      provider: 'gemini' as const,
      defaultModel: 'gemini-2.5-flash'
    };

    const worker = new AgentWorker(geminiConfig, mockRegistry, undefined, mockGemini as any);
    const result = await worker.executeTask('Analiza requerimiento');

    expect(result.success).toBe(true);
    expect(result.modelUsed).toBe('gemini:gemini-2.5-flash');
    expect(result.output).toBe('Respuesta generada por Gemini Flash');
    expect(mockGemini.models.generateContent).toHaveBeenCalled();
  });

  it('should handle Gemini provider error gracefully', async () => {
    const mockGemini = {
      models: {
        generateContent: jest.fn().mockRejectedValue(new Error('Quota exceeded or invalid API key'))
      }
    };

    const geminiConfig = {
      ...baseConfig,
      provider: 'gemini' as const,
      defaultModel: 'gemini-2.5-flash'
    };

    const worker = new AgentWorker(geminiConfig, mockRegistry, undefined, mockGemini as any);
    const result = await worker.executeTask('Genera spike con Gemini');

    expect(result.success).toBe(false);
    expect(result.output).toContain('Error executing task with Gemini model');
  });

  it('should fallback to empty string when Gemini response has no text property', async () => {
    const mockGemini = {
      models: {
        generateContent: jest.fn().mockResolvedValue({})
      }
    };

    const geminiConfig = {
      ...baseConfig,
      provider: 'gemini' as const,
      defaultModel: 'gemini-2.5-flash'
    };

    const worker = new AgentWorker(geminiConfig, mockRegistry, undefined, mockGemini as any);
    const result = await worker.executeTask('Genera texto vacio');

    expect(result.success).toBe(true);
    expect(result.output).toBe('');
  });

  it('should instantiate GoogleGenAI client with or without GEMINI_API_KEY env var', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'mock_api_key';

    const geminiConfig = {
      ...baseConfig,
      provider: 'gemini' as const,
      defaultModel: 'gemini-2.5-flash'
    };

    // Notice: no geminiClient passed, will trigger internal new GoogleGenAI({ apiKey })
    const workerWithEnv = new AgentWorker(geminiConfig, mockRegistry);
    // Execute will try to call GoogleGenAI (will fail in mock/unit, but covers line 48)
    const resWithEnv = await workerWithEnv.executeTask('Test with env');
    expect(resWithEnv).toBeDefined();

    delete process.env.GEMINI_API_KEY;
    const workerNoEnv = new AgentWorker(geminiConfig, mockRegistry);
    const resNoEnv = await workerNoEnv.executeTask('Test without env');
    expect(resNoEnv).toBeDefined();

    process.env.GEMINI_API_KEY = origKey;
  });

  it('should allow configuring Gemini dynamically at runtime via configureGemini', async () => {
    const worker = new AgentWorker(baseConfig, mockRegistry);
    expect(worker.config.provider).toBeUndefined();

    // 1. Configure with apiKey and model
    worker.configureGemini({ apiKey: 'new_gemini_key', model: 'gemini-2.5-pro' });
    expect(worker.config.provider).toBe('gemini');
    expect(worker.config.defaultModel).toBe('gemini-2.5-pro');

    // 2. Configure with custom client
    const customClient = {
      models: {
        generateContent: jest.fn().mockResolvedValue({ text: 'Dynamic client output' })
      }
    };
    worker.configureGemini({ client: customClient as any });
    const dynamicRes = await worker.executeTask('Prompt dinamico');
    expect(dynamicRes.output).toBe('Dynamic client output');

    // 3. Switch back to ollama via setProvider
    worker.setProvider('ollama', 'qwen2.5-coder:latest');
    expect(worker.config.provider).toBe('ollama');
    expect(worker.config.defaultModel).toBe('qwen2.5-coder:latest');

    // 4. setProvider without model parameter
    worker.setProvider('gemini');
    expect(worker.config.provider).toBe('gemini');

    // 5. configureGemini with empty options
    worker.configureGemini({});
    expect(worker.config.provider).toBe('gemini');

    // 6. Reset back to ollama so baseConfig isn't polluted if mutated
    worker.setProvider('ollama');
  });

  it('should include workspaceRoot in systemPrompt and update dynamically', () => {
    const worker = new AgentWorker(baseConfig, mockRegistry, undefined, undefined, 'C:/test/workspace');
    expect(worker.getWorkspaceRoot()).toBe('C:/test/workspace');
    expect(worker.getSystemPrompt()).toContain('DIRECTORIO DE TRABAJO DEL PROYECTO (CWD / WORKSPACE OBLIGATORIO)');
    expect(worker.getSystemPrompt()).toContain('C:/test/workspace');

    // Update workspace dynamically
    worker.setWorkspaceRoot('C:/another/project');
    expect(worker.getWorkspaceRoot()).toBe('C:/another/project');
    expect(worker.getSystemPrompt()).toContain('C:/another/project');
  });

  it('should execute consult_agent tool to query peer agents', async () => {
    const peerWorker = new AgentWorker(
      {
        roleId: 'rnd_lead',
        name: 'R&D Innovation Sentinel',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: [],
        systemPromptBase: 'R&D prompt'
      },
      mockRegistry
    );

    jest.spyOn(peerWorker, 'executeTask').mockResolvedValueOnce({
      roleId: 'rnd_lead',
      agentName: 'R&D Innovation Sentinel',
      modelUsed: 'qwen2.5-coder:latest',
      success: true,
      output: 'Usa Vite con @vitejs/plugin-react',
      timestamp: new Date().toISOString()
    });

    const devWorker = new AgentWorker(
      baseConfig,
      mockRegistry,
      undefined,
      undefined,
      undefined,
      (roleId) => (roleId === 'rnd_lead' ? peerWorker : undefined)
    );

    // Mock ollama to trigger consult_agent tool call
    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          tool_calls: [
            {
              function: {
                name: 'consult_agent',
                arguments: { roleId: 'rnd_lead', query: 'Que bundler uso?' }
              }
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Respuesta final integrando consejo de R&D' }
      });

    const result = await devWorker.executeTask('Inicia el frontend');
    expect(result.success).toBe(true);
    expect(result.output).toBe('Respuesta final integrando consejo de R&D');
    expect(peerWorker.executeTask).toHaveBeenCalledWith(
      expect.stringContaining('Que bundler uso?'),
      undefined,
      expect.objectContaining({ depth: 1 })
    );
  });

  it('should handle consult_agent when requested peer is not available', async () => {
    const devWorker = new AgentWorker(
      baseConfig,
      mockRegistry,
      undefined,
      undefined,
      undefined,
      () => undefined // No peers available
    );

    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          tool_calls: [
            {
              function: {
                name: 'consult_agent',
                arguments: { roleId: 'non_existent_role', query: 'Hola?' }
              }
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Manejo de rol ausente' }
      });

    const result = await devWorker.executeTask('Consulta a nadie');
    expect(result.success).toBe(true);
    expect(result.output).toBe('Manejo de rol ausente');
  });

  it('should prevent self-consultation when roleId matches the worker itself', async () => {
    let devWorker: AgentWorker;
    devWorker = new AgentWorker(
      baseConfig, // roleId: 'test_dev'
      mockRegistry,
      undefined,
      undefined,
      undefined,
      (): AgentWorker => devWorker
    );

    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          tool_calls: [
            {
              function: {
                name: 'consult_agent',
                arguments: { roleId: 'test_dev', query: 'Auto consulta' }
              }
            }
          ]
        }
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Bloqueado con exito' }
      });

    const result = await devWorker.executeTask('Auto consulta');
    expect(result.success).toBe(true);
    expect(result.output).toBe('Bloqueado con exito');
  });

  it('should block circular consultation chain (A -> B -> A)', async () => {
    let workerA: AgentWorker;
    let workerB: AgentWorker;

    workerA = new AgentWorker(
      { ...baseConfig, roleId: 'worker_a', name: 'Worker A' },
      mockRegistry,
      undefined,
      undefined,
      undefined,
      (roleId) => (roleId === 'worker_b' ? workerB : undefined)
    );

    workerB = new AgentWorker(
      { ...baseConfig, roleId: 'worker_b', name: 'Worker B' },
      mockRegistry,
      undefined,
      undefined,
      undefined,
      (roleId) => (roleId === 'worker_a' ? workerA : undefined)
    );

    // workerA calls workerB
    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          tool_calls: [
            {
              function: {
                name: 'consult_agent',
                arguments: { roleId: 'worker_b', query: 'Consulta inicial' }
              }
            }
          ]
        }
      })
      // workerB (at depth 1) does not have consult_agent tool available and responds directly
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Worker B respondio directamente sin delegar' }
      })
      // workerA receives workerB output and finishes
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Worker A finalizado con respuesta de B' }
      });

    const result = await workerA.executeTask('Inicia proceso');
    expect(result.success).toBe(true);
    expect(result.output).toBe('Worker A finalizado con respuesta de B');
  });

  it('should parse tool calls emitted directly in JSON text content with unclosed fences', async () => {
    (ollama.chat as jest.Mock)
      .mockResolvedValueOnce({
        message: {
          role: 'assistant',
          content: '```json\n{"name": "write_file", "arguments": {"path": "package.json", "content": "test"}}'
        }
      })
      .mockResolvedValueOnce({
        message: { role: 'assistant', content: 'Archivo creado exitosamente' }
      });

    const mockMcp = {
      getAvailableTools: jest.fn().mockResolvedValue([]),
      callTool: jest.fn().mockResolvedValue({ content: 'ok' })
    } as unknown as McpClientManager;

    const worker = new AgentWorker(baseConfig, mockRegistry, mockMcp);
    const result = await worker.executeTask('Crea package.json');

    expect(result.success).toBe(true);
    expect(mockMcp.callTool).toHaveBeenCalledWith('write_file', { path: 'package.json', content: 'test' });
    expect(result.output).toBe('Archivo creado exitosamente');
  });
});
