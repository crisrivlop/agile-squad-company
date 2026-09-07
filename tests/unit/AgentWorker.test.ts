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
});
