export interface AgentRoleConfig {
  roleId: string;
  name: string;
  defaultModel: string;
  requiredSkills: string[];
  systemPromptBase: string;
}

export interface CompanyTask {
  id: string;
  title: string;
  description: string;
  context?: Record<string, any>;
}

export interface AgentExecutionResult {
  roleId: string;
  agentName: string;
  modelUsed: string;
  success: boolean;
  output: string;
  timestamp: string;
}
