import { CompanyOrchestrator } from './CompanyOrchestrator';

async function testParallelDevsAndIntegrator() {
  console.log('===============================================================');
  console.log('🧪 TEST: ELECCIÓN DE DEVS, TRABAJO EN PARALELO E INTEGRACIÓN');
  console.log('===============================================================\n');

  // 1. Demostración de Selección Personalizada de Agentes en la Empresa
  console.log('1️⃣ Instanciando empresa con selección personalizada de agentes:');
  const customCompany = new CompanyOrchestrator({
    includeRoles: ['backend_developer', 'frontend_developer', 'repo_integrator']
  });

  console.log('Agentes activos en este Squad específico:');
  for (const r of customCompany.listWorkers()) {
    const w = customCompany.getWorker(r);
    console.log(` - [${r}]: ${w?.config.name}`);
  }

  // 2. Demostración de Ejecución en Paralelo (Backend + Frontend trabajando al mismo tiempo)
  console.log('\n2️⃣ Lanzando Backend Dev y Frontend Dev en PARALELO con Ollama...');
  const t0 = Date.now();
  const parallelTasks = [
    {
      roleId: 'backend_developer',
      prompt: 'Diseña en 3 viñetas un endpoint POST /auth/login con DTO en TypeScript.'
    },
    {
      roleId: 'frontend_developer',
      prompt: 'Diseña en 3 viñetas una pantalla LoginForm en Flutter o React consumiendo POST /auth/login.'
    }
  ];

  const devOutputs = await customCompany.executeInParallel(parallelTasks);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n⏱️ Tareas concurrentes terminadas en paralelo en ${elapsed}s!`);

  for (const res of devOutputs) {
    console.log(`\n--- 👤 Salida de [${res.agentName}] ---`);
    console.log(res.output.trim().slice(0, 300) + '...\n');
  }

  // 3. Rol del Integrador de Repositorios
  console.log('3️⃣ Ejecutando al Repository & Monorepo Integrator...');
  const integrator = customCompany.getWorker('repo_integrator');
  if (integrator) {
    const integRes = await integrator.executeTask(`
Analiza estos dos módulos desarrollados en paralelo por diferentes devs:
Módulo Backend:
${devOutputs[0].output}

Módulo Frontend:
${devOutputs[1].output}

Valida la compatibilidad de contratos entre repositorios y explica cómo integrarlos sin fricción.
`);
    console.log('\n--- 🔗 Salida de [Repository & Monorepo Integrator] ---');
    console.log(integRes.output);
  }

  console.log('\n===============================================================');
  console.log('✅ Validación completada con éxito!');
  console.log('===============================================================');
}

testParallelDevsAndIntegrator().catch(err => {
  console.error('Error en test:', err);
});
