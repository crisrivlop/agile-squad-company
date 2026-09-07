import ollama from 'ollama';
import { GoogleGenAI } from '@google/genai';
import { AgentRoleConfig, AgentExecutionResult } from './types';
import { SkillRegistry } from './SkillRegistry';
import { McpClientManager } from './McpClientManager';

export class AgentWorker {
  public config: AgentRoleConfig;
  private skillRegistry: SkillRegistry;
  private systemPrompt: string;
  private mcpManager?: McpClientManager;
  private geminiClient?: GoogleGenAI;

  constructor(
    config: AgentRoleConfig,
    skillRegistry: SkillRegistry,
    mcpManager?: McpClientManager,
    geminiClient?: GoogleGenAI
  ) {
    this.config = config;
    this.skillRegistry = skillRegistry;
    this.mcpManager = mcpManager;
    this.geminiClient = geminiClient;
    this.systemPrompt = this.skillRegistry.buildSystemPrompt(
      config.roleId,
      config.name,
      config.requiredSkills,
      config.systemPromptBase
    );
  }

  public async executeTask(taskPrompt: string, overrideModel?: string): Promise<AgentExecutionResult> {
    const provider = this.config.provider || 'ollama';
    const model = overrideModel || this.config.defaultModel;
    const timestamp = new Date().toISOString();

    if (provider === 'gemini') {
      return await this.executeWithGemini(taskPrompt, model, timestamp);
    }

    return await this.executeWithOllama(taskPrompt, model, timestamp);
  }

  private async executeWithGemini(taskPrompt: string, model: string, timestamp: string): Promise<AgentExecutionResult> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = this.geminiClient || new GoogleGenAI(apiKey ? { apiKey } : {});

      const response = await ai.models.generateContent({
        model: model,
        contents: taskPrompt,
        config: {
          systemInstruction: this.systemPrompt
        }
      });

      return {
        roleId: this.config.roleId,
        agentName: this.config.name,
        modelUsed: `gemini:${model}`,
        success: true,
        output: response.text || '',
        timestamp
      };
    } catch (error) {
      return {
        roleId: this.config.roleId,
        agentName: this.config.name,
        modelUsed: `gemini:${model}`,
        success: false,
        output: `Error executing task with Gemini model [${model}]: ${(error as Error).message}`,
        timestamp
      };
    }
  }

  private async executeWithOllama(taskPrompt: string, model: string, timestamp: string): Promise<AgentExecutionResult> {
    try {
      const messages: any[] = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: taskPrompt }
      ];

      // Prepare tools from MCP Client if available
      let tools: any[] | undefined = undefined;
      if (this.mcpManager) {
        const mcpTools = await this.mcpManager.getAvailableTools();
        tools = mcpTools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema
          }
        }));
      }

      // Initial chat request
      let response = await ollama.chat({
        model: model,
        messages: messages,
        tools: tools
      });

      // Tool Call Execution Loop (ReAct)
      let iterations = 0;
      const maxIterations = 5;

      while (response.message.tool_calls && response.message.tool_calls.length > 0 && iterations < maxIterations) {
        iterations++;
        messages.push(response.message);

        for (const call of response.message.tool_calls) {
          const toolName = call.function.name;
          const toolArgs = call.function.arguments;
          console.log(` 🛠️ [${this.config.name}] Executing MCP Tool: "${toolName}" with args:`, toolArgs);

          let toolResultContent = '';
          if (this.mcpManager) {
            const res = await this.mcpManager.callTool(toolName, toolArgs);
            toolResultContent = JSON.stringify(res.content || res);
          } else {
            toolResultContent = 'Error: No MCP client connected to worker.';
          }

          messages.push({
            role: 'tool',
            content: toolResultContent
          });
        }

        // Send tool results back to Ollama
        response = await ollama.chat({
          model: model,
          messages: messages,
          tools: tools
        });
      }

      return {
        roleId: this.config.roleId,
        agentName: this.config.name,
        modelUsed: model,
        success: true,
        output: response.message.content,
        timestamp
      };
    } catch (error) {
      return {
        roleId: this.config.roleId,
        agentName: this.config.name,
        modelUsed: model,
        success: false,
        output: `Error executing task with Ollama model [${model}]: ${(error as Error).message}`,
        timestamp
      };
    }
  }
}
