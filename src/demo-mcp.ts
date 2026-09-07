import { McpClientManager } from './McpClientManager';
import * as path from 'path';

async function testMcpClient() {
  console.log('====================================================');
  console.log('🧪 TEST: MCP CLIENT CONECTADO A OFFICIAL FILESYSTEM MCP');
  console.log('====================================================\n');

  const workspaceRoot = path.resolve(process.cwd());
  const manager = new McpClientManager(workspaceRoot);

  console.log('1️⃣ Conectando al servidor oficial @modelcontextprotocol/server-filesystem...');
  await manager.connect();

  console.log('\n2️⃣ Descubriendo herramientas (tools) expuestas por el servidor MCP:');
  const tools = await manager.getAvailableTools();
  console.log(`Herramientas detectadas (${tools.length}):`);
  for (const t of tools) {
    console.log(` - 🛠️  ${t.name}: ${t.description?.slice(0, 70)}...`);
  }

  console.log('\n3️⃣ Invocando herramienta "list_directory" a través de JSON-RPC:');
  const listRes = await manager.callTool('list_directory', { path: workspaceRoot });
  console.log('Contenido del workspace retornado por el servidor MCP:');
  console.log(listRes.content[0]?.text?.slice(0, 300) + '...\n');

  await manager.disconnect();
  console.log('====================================================');
  console.log('✅ Conexión MCP Client verificada y funcionando!');
  console.log('====================================================');
}

testMcpClient().catch(err => {
  console.error('Error en test MCP:', err);
});
