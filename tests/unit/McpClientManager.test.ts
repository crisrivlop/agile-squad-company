import { McpClientManager } from '../../src/McpClientManager';
import * as path from 'path';

describe('McpClientManager Unit & Error Handling Tests', () => {
  it('should disconnect cleanly when client was active', async () => {
    const workspacePath = path.resolve(__dirname, '../../');
    const manager = new McpClientManager(workspacePath);
    await manager.connect();
    expect(manager).toBeDefined();

    await manager.disconnect();
    // Second disconnect should be a safe no-op
    await manager.disconnect();
  });

  it('should handle tool call error safely', async () => {
    const workspacePath = path.resolve(__dirname, '../../');
    const manager = new McpClientManager(workspacePath);
    await manager.connect();

    // Call non-existent tool to trigger error block
    const errorRes = await manager.callTool('completely_unknown_tool', {});
    expect(errorRes.isError).toBe(true);
    expect(errorRes.content[0].text).toContain('Tool completely_unknown_tool not found');

    await manager.disconnect();
  });

  it('should auto-connect if getAvailableTools or callTool are called without manual connect', async () => {
    const workspacePath = path.resolve(__dirname, '../../');
    const manager = new McpClientManager(workspacePath);
    // Notice: manager.connect() is NOT called explicitly
    const tools = await manager.getAvailableTools();
    expect(tools.length).toBeGreaterThanOrEqual(1);

    await manager.disconnect();
  });
});
