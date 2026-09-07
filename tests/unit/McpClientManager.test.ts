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

    // Force client!.callTool to throw an unexpected exception to cover catch (error) on line 68
    const client = (manager as any).client;
    jest.spyOn(client, 'callTool').mockRejectedValueOnce(new Error('Low-level RPC breakdown'));
    const thrownRes = await manager.callTool('list_directory', {});
    expect(thrownRes.isError).toBe(true);
    expect(thrownRes.content[0].text).toContain('Tool error: Low-level RPC breakdown');

    await manager.disconnect();
  });

  it('should auto-connect if getAvailableTools or callTool are called without manual connect', async () => {
    const workspacePath = path.resolve(__dirname, '../../');
    const manager = new McpClientManager(workspacePath);
    // Notice: manager.connect() is NOT called explicitly
    const tools = await manager.getAvailableTools();
    expect(tools.length).toBeGreaterThanOrEqual(1);

    // Call tool directly when already connected
    const res = await manager.callTool('list_directory', { path: workspacePath });
    expect(res).toBeDefined();

    // Call connect() again when already connected to test line 21
    await manager.connect();

    await manager.disconnect();

    // Call callTool directly on disconnected manager to trigger auto-connect at line 58
    const directRes = await manager.callTool('list_directory', { path: workspacePath });
    expect(directRes).toBeDefined();

    await manager.disconnect();
  });

  it('should instantiate with default process.cwd() when no path is passed', () => {
    const manager = new McpClientManager();
    expect((manager as any).allowedWorkspacePath).toBe(process.cwd());
  });
});
