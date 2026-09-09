import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as path from 'path';
import * as fs from 'fs';

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: any;
}

export class McpClientManager {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private allowedWorkspacePath: string;

  constructor(allowedWorkspacePath?: string) {
    this.allowedWorkspacePath = allowedWorkspacePath || path.resolve(process.cwd());
  }

  public async connect(): Promise<void> {
    if (this.client) return;

    // Launch official @modelcontextprotocol/server-filesystem via stdio
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', this.allowedWorkspacePath]
    });

    this.client = new Client(
      {
        name: 'agile-squad-mcp-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    await this.client.connect(this.transport);
    console.log(`🔌 [MCP Client] Connected to official FileSystem MCP jailed to: ${this.allowedWorkspacePath}`);
  }

  public async getAvailableTools(): Promise<McpToolDefinition[]> {
    if (!this.client) {
      await this.connect();
    }

    const res = await this.client!.listTools();
    return res.tools.map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema
    }));
  }

  public async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.client) {
      await this.connect();
    }

    // Normalize path parameter to ensure absolute path within allowedWorkspacePath
    const normalizedArgs = { ...args };
    if (normalizedArgs.path && typeof normalizedArgs.path === 'string') {
      let candidate = normalizedArgs.path;
      if (!path.isAbsolute(candidate)) {
        candidate = path.resolve(this.allowedWorkspacePath, candidate);
      }
      normalizedArgs.path = candidate;

      if (toolName === 'write_file' || toolName === 'create_file') {
        const parentDir = path.dirname(candidate);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
      }
    }

    try {
      const result = await this.client!.callTool({
        name: toolName,
        arguments: normalizedArgs
      });
      return result;
    } catch (error) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool error: ${(error as Error).message}` }]
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }
}
