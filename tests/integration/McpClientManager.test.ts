import { McpClientManager } from '../../src/McpClientManager';
import * as path from 'path';

describe('McpClientManager Integration (Live MCP Server)', () => {
  let mcpManager: McpClientManager;
  const workspacePath = path.resolve(__dirname, '../../');

  beforeAll(async () => {
    mcpManager = new McpClientManager(workspacePath);
    await mcpManager.connect();
  }, 20000);

  afterAll(async () => {
    await mcpManager.disconnect();
  });

  it('should discover official filesystem tools', async () => {
    const tools = await mcpManager.getAvailableTools();
    expect(tools.length).toBeGreaterThanOrEqual(10);

    const toolNames = tools.map(t => t.name);
    expect(toolNames).toContain('list_directory');
    expect(toolNames).toContain('read_text_file');
    expect(toolNames).toContain('write_file');
  });

  it('should execute list_directory tool via JSON-RPC', async () => {
    const res = await mcpManager.callTool('list_directory', { path: workspacePath });
    expect(res).toBeDefined();
    expect(res.content).toBeDefined();
    expect(res.content[0].type).toBe('text');
    expect(res.content[0].text).toContain('package.json');
  });
});
