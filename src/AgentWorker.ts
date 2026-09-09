import ollama from 'ollama';
import { GoogleGenAI } from '@google/genai';
import { AgentRoleConfig, AgentExecutionResult, WebSearchTool } from './types';
import { SkillRegistry } from './SkillRegistry';
import { McpClientManager } from './McpClientManager';

export class AgentWorker {
  public config: AgentRoleConfig;
  private skillRegistry: SkillRegistry;
  private systemPrompt: string = '';
  private mcpManager?: McpClientManager;
  private geminiClient?: GoogleGenAI;
  private workspaceRoot?: string;
  private peerResolver?: (roleId: string) => AgentWorker | undefined;

  constructor(
    config: AgentRoleConfig,
    skillRegistry: SkillRegistry,
    mcpManager?: McpClientManager,
    geminiClient?: GoogleGenAI,
    workspaceRoot?: string,
    peerResolver?: (roleId: string) => AgentWorker | undefined
  ) {
    this.config = config;
    this.skillRegistry = skillRegistry;
    this.mcpManager = mcpManager;
    this.geminiClient = geminiClient;
    this.workspaceRoot = workspaceRoot;
    this.peerResolver = peerResolver;
    this.rebuildSystemPrompt();
  }

  public setPeerResolver(peerResolver: (roleId: string) => AgentWorker | undefined): void {
    this.peerResolver = peerResolver;
  }

  public setWorkspaceRoot(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot;
    this.rebuildSystemPrompt();
  }

  public getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }

  public getSystemPrompt(): string {
    return this.systemPrompt;
  }

  private rebuildSystemPrompt(): void {
    const basePrompt = this.skillRegistry.buildSystemPrompt(
      this.config.roleId,
      this.config.name,
      this.config.requiredSkills,
      this.config.systemPromptBase
    );

    const cwdDirective = this.workspaceRoot
      ? `\n\nDIRECTORIO DE TRABAJO DEL PROYECTO (CWD / WORKSPACE OBLIGATORIO):
"${this.workspaceRoot}"
Cualquier archivo que crees, leas o modifiques con herramientas (write_file, edit_file, read_text_file, list_directory, etc.) DEBE ubicarse estrictamente dentro de este directorio usando rutas relativas a este directorio. No intentes acceder a rutas fuera de este directorio.`
      : '';

    this.systemPrompt = `${basePrompt}${cwdDirective}`;
  }

  /**
   * Configures or re-configures Gemini provider dynamically at runtime.
   * Can update the apiKey, model, or pass a custom GoogleGenAI client instance.
   */
  public configureGemini(options: { apiKey?: string; model?: string; client?: GoogleGenAI }): void {
    if (options.client) {
      this.geminiClient = options.client;
    } else if (options.apiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey: options.apiKey });
    }

    if (options.model) {
      this.config.defaultModel = options.model;
    }
    this.config.provider = 'gemini';
  }

  /**
   * Switches the AI execution provider on the fly ('ollama' | 'gemini')
   */
  public setProvider(provider: 'ollama' | 'gemini', model?: string): void {
    this.config.provider = provider;
    if (model) {
      this.config.defaultModel = model;
    }
  }

  public setMcpManager(mcpManager?: McpClientManager): void {
    this.mcpManager = mcpManager;
  }

  public async executeTask(
    taskPrompt: string,
    overrideModel?: string,
    context?: { callStack?: string[]; depth?: number }
  ): Promise<AgentExecutionResult> {
    const provider = this.config.provider || 'ollama';
    const model = overrideModel || this.config.defaultModel;
    const timestamp = new Date().toISOString();
    const currentStack = context?.callStack || [this.config.roleId];
    const currentDepth = context?.depth || 0;

    if (provider === 'gemini') {
      return await this.executeWithGemini(taskPrompt, model, timestamp);
    }

    return await this.executeWithOllama(taskPrompt, model, timestamp, currentStack, currentDepth);
  }

  private async executeWithGemini(taskPrompt: string, model: string, timestamp: string): Promise<AgentExecutionResult> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      const ai = this.geminiClient || new GoogleGenAI(apiKey ? { apiKey } : {});

      // Add Google Search grounding if supported / enabled
      const tools = [{ googleSearch: {} }];

      const response = await ai.models.generateContent({
        model: model,
        contents: taskPrompt,
        config: {
          systemInstruction: this.systemPrompt,
          tools: tools as any
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

  private async executeWithOllama(
    taskPrompt: string,
    model: string,
    timestamp: string,
    callStack: string[] = [this.config.roleId],
    depth: number = 0
  ): Promise<AgentExecutionResult> {
    try {
      const messages: any[] = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: taskPrompt }
      ];

      // Prepare tools from MCP Client if available
      let tools: any[] = [];
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

      // Add DuckDuckGo Web Search tool for Ollama
      tools.push({
        type: 'function',
        function: {
          name: 'web_search_duckduckgo',
          description: 'Busca informacion en la web usando DuckDuckGo sin requerir API keys.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Termino o pregunta de busqueda' }
            },
            required: ['query']
          }
        }
      });

      // Add Inter-Agent Communication tool (Peer-to-Peer consultation) - ONLY at root level (depth === 0)
      if (this.peerResolver && depth === 0) {
        tools.push({
          type: 'function',
          function: {
            name: 'consult_agent',
            description: 'Consulta a un companero especialista del equipo (ej. "rnd_lead" para investigar stacks/librerias modernas o "tech_architect" para dudas de arquitectura). PROHIBIDO consultarte a ti mismo.',
            parameters: {
              type: 'object',
              properties: {
                roleId: {
                  type: 'string',
                  description: 'ID del rol del companero a consultar (DISTINTO a tu propio rol). Ejemplos: "rnd_lead", "tech_architect", "qa_lead", "appsec_lead"'
                },
                query: {
                  type: 'string',
                  description: 'Palabras clave o pregunta tecnica breve y concreta (maximo 15 palabras). Ej: "stack recomendado React Vite TypeScript"'
                }
              },
              required: ['roleId', 'query']
            }
          }
        });
      }

      // Initial chat request
      let response = await ollama.chat({
        model: model,
        messages: messages,
        tools: tools.length > 0 ? tools : undefined
      });

      // Tool Call Execution Loop (ReAct)
      let iterations = 0;
      const maxIterations = 5;

      while (iterations < maxIterations) {
        let callsToExecute: { name: string; args: any }[] = [];

        // Case A: Native tool_calls reported by Ollama
        if (response.message.tool_calls && response.message.tool_calls.length > 0) {
          callsToExecute = response.message.tool_calls.map((c: any) => ({
            name: c.function.name,
            args: c.function.arguments
          }));
        } 
        // Case B: Ollama models like qwen2.5-coder emit JSON tool calls directly in text content
        else if (response.message.content) {
          const content = response.message.content.trim();
          let candidate = '';

          // 1. Try markdown fenced block ```json ... ``` or unclosed ```json ...
          const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/);
          if (fenceMatch && fenceMatch[1].trim().startsWith('{')) {
            candidate = fenceMatch[1].trim();
          } else {
            // 2. Try to find any JSON object containing "name" or "tool"
            const jsonObjectMatch = content.match(/\{[\s\S]*?"(?:name|tool)"\s*:\s*"[^"]+"[\s\S]*?\}/);
            if (jsonObjectMatch) {
              candidate = jsonObjectMatch[0].trim();
            } else if (content.startsWith('{') && content.endsWith('}')) {
              candidate = content;
            }
          }

          if (candidate) {
            try {
              const parsed = JSON.parse(candidate);
              if (parsed && (parsed.name || parsed.tool)) {
                callsToExecute.push({
                  name: parsed.name || parsed.tool,
                  args: parsed.arguments || parsed.args || parsed.parameters || {}
                });
              }
            } catch {
              // Lenient parsing failed, treat as normal conversational output
            }
          }
        }

        if (callsToExecute.length === 0) {
          break;
        }

        iterations++;
        messages.push(response.message);

        for (const call of callsToExecute) {
          const toolName = call.name;
          const toolArgs = call.args;
          console.log(` 🛠️ [${this.config.name}] Executing Tool: "${toolName}" with args:`, toolArgs);

          let toolResultContent = '';
          if (toolName === 'web_search_duckduckgo') {
            const query = toolArgs?.query || '';
            const searchResults = await WebSearchTool.searchDuckDuckGo(query);
            toolResultContent = JSON.stringify(searchResults);
          } else if (toolName === 'consult_agent') {
            const targetRole = toolArgs?.roleId;
            const query = typeof toolArgs?.query === 'string' ? toolArgs.query.trim() : '';

            // Prevent self-consultation and circular call chains (e.g. A -> B -> A -> B)
            if (targetRole === this.config.roleId || callStack.includes(targetRole)) {
              toolResultContent = JSON.stringify({
                error: `Llamada circular bloqueada: "${targetRole}" ya forma parte de la cadena de consulta activa [${callStack.join(' -> ')}]. Responde con tus conocimientos tecnicos actuales sin volver a consultar.`
              });
            } else if (depth >= 1) {
              toolResultContent = JSON.stringify({
                error: `Limite de profundidad de consultas alcanzado (maximo 1 nivel de delegacion). Responde directamente.`
              });
            } else {
              const peer = this.peerResolver ? this.peerResolver(targetRole) : undefined;
              if (peer) {
                // Sanitize and trim query to prevent giant repetitive prompt echoes
                const sanitizedQuery = query.length > 300 ? query.slice(0, 300) + '...' : query;
                console.log(` 💬 [${this.config.name}] Consulting peer "${peer.config.name}" (${targetRole}): "${sanitizedQuery}"...`);
                const peerResponse = await peer.executeTask(
                  `Consulta de tu companero "${this.config.name}":\n${sanitizedQuery}`,
                  undefined,
                  { callStack: [...callStack, targetRole], depth: depth + 1 }
                );
                toolResultContent = JSON.stringify({
                  from: peer.config.name,
                  roleId: targetRole,
                  answer: peerResponse.output
                });
                console.log(` 💬 [${this.config.name}] Received consultation response from "${peer.config.name}".`);
              } else {
                toolResultContent = JSON.stringify({
                  error: `El rol "${targetRole}" no esta disponible en el equipo para consulta.`
                });
              }
            }
          } else if (this.mcpManager) {
            const res = await this.mcpManager.callTool(toolName, toolArgs);
            toolResultContent = JSON.stringify(res.content || res);
            if (res.isError) {
              console.log(` ⚠️ [${this.config.name}] Tool "${toolName}" returned error:`, toolResultContent);
            } else {
              console.log(` ✅ [${this.config.name}] Tool "${toolName}" executed successfully in workspace.`);
            }
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
