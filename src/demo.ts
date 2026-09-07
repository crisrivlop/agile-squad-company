import { CompanyOrchestrator } from './CompanyOrchestrator';

async function main() {
  console.log('====================================================');
  console.log('🤖 AGILE SQUAD COMPANY - AI AUTONOMOUS DEV ORCHESTRATOR');
  console.log('   Powered by Local Ollama & Agile Squad Skills/MCP');
  console.log('====================================================\n');

  const company = new CompanyOrchestrator();
  const workers = company.listWorkers();

  console.log(`[Squad Loaded] ${workers.length} specialized AI roles ready:`);
  for (const w of workers) {
    const worker = company.getWorker(w);
    console.log(` - [${w}]: ${worker?.config.name} (Model: ${worker?.config.defaultModel})`);
  }

  console.log('\n----------------------------------------------------');
  console.log('Running quick test with Branch Manager & R&D Lead...');
  console.log('----------------------------------------------------\n');

  // Test Branch Manager
  const branchMgr = company.getWorker('branch_manager');
  if (branchMgr) {
    console.log('Testing Branch & GitFlow Guardian with Ollama...');
    const res = await branchMgr.executeTask('¿Cuál es la convención para ramas de hotfix y cómo se deben proteger las ramas main y develop según Trunk-Based/GitFlow?');
    console.log('\n--- [Respuesta de Branch Manager] ---');
    console.log(res.output);
  }

  // Test R&D Lead
  const rndLead = company.getWorker('rnd_lead');
  if (rndLead) {
    console.log('\nTesting R&D Innovation Sentinel with Ollama...');
    const res = await rndLead.executeTask('Haz un spike rápido evaluando el uso de SQLite local vs DuckDB para un agente autónomo que necesita caching vectorial rápido.');
    console.log('\n--- [Respuesta de R&D Lead] ---');
    console.log(res.output);
  }

  console.log('\n====================================================');
  console.log('✅ Agile Squad Company validation completed!');
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal error in company demo:', err);
});
