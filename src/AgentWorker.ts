import ollama from 'ollama';
import { AgentRoleConfig, AgentExecutionResult } from './types';
import { SkillRegistry } from './SkillRegistry';

export class AgentWorker {
  public config: AgentRoleConfig;
  private skillRegistry: SkillRegistry;
  private systemPrompt: string;

  constructor(config: AgentRoleConfig, skillRegistry: SkillRegistry) {
    this.config = config;
    this.skillRegistry = skillRegistry;
    this.systemPrompt = this.skillRegistry.buildSystemPrompt(
      config.roleId,
      config.name,
      config.requiredSkills,
      config.systemPromptBase
    );
  }

  public async executeTask(taskPrompt: string, overrideModel?: string): Promise<AgentExecutionResult> {
    const model = overrideModel || this.config.defaultModel;
    const timestamp = new Date().toISOString();

    try {
      const response = await ollama.chat({
        model: model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: taskPrompt }
        ]
      });

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
