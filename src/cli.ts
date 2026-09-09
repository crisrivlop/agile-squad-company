import * as readline from 'readline';
import { CompanyOrchestrator } from './CompanyOrchestrator';
import { WebSearchTool } from './types';

function createPrompt(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

import * as fs from 'fs';
import * as path from 'path';

async function showMenu() {
  console.log('\n===============================================================');
  console.log('🏢 BIENVENIDO A AGILE SQUAD COMPANY (AI AUTONOMOUS DEV)');
  console.log('===============================================================');

  const initialRl = createPrompt();
  const defaultPath = path.resolve(process.env.WORKSPACE_PATH || process.cwd());
  console.log(`📂 Ruta por defecto: ${defaultPath}`);
  const inputPath = await ask(initialRl, '👉 Define la ubicación del proyecto a intervenir [Enter para usar por defecto]: ');
  initialRl.close();

  let targetPath = inputPath ? path.resolve(inputPath) : defaultPath;
  if (!fs.existsSync(targetPath)) {
    console.log(`⚠️ La ruta "${targetPath}" no existe. Se creará el directorio...`);
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`✅ Directorio creado: ${targetPath}`);
    } catch (err) {
      console.warn(`No se pudo crear el directorio, usando directorio actual: ${process.cwd()}`);
      targetPath = process.cwd();
    }
  }

  try {
    process.chdir(targetPath);
    console.log(`🧭 Entorno de ejecución (CWD) sincronizado a: ${process.cwd()}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo cambiar el CWD del proceso: ${(err as Error).message}`);
  }

  const company = new CompanyOrchestrator({ workspaceRoot: targetPath, enableMcpTools: true });
  let currentProvider: 'ollama' | 'gemini' = 'ollama';

  while (true) {
    console.log('\n===============================================================');
    console.log('🏢 AGILE SQUAD COMPANY - MENÚ INICIALIZADOR');
    console.log(`🤖 Proveedor Activo: [${currentProvider.toUpperCase()}]`);
    console.log(`📂 Proyecto Activo:  [${company.getWorkspaceRoot()}]`);
    console.log('===============================================================');
    console.log('1️⃣  🚀 Pipeline Completo (Feature End-to-End: PO -> Arq -> Devs -> QA -> Doc -> Release)');
    console.log('2️⃣  ⚡ Pipeline Paralelo Multi-Dev (Backend + Frontend concurrentes + Integrador)');
    console.log('3️⃣  🔍 R&D con Búsqueda Web en Vivo (Google Search / DuckDuckGo)');
    console.log('4️⃣  👥 Inspeccionar Squad de Agentes y Skills Cargados');
    console.log('5️⃣  🔌 Prueba de Herramientas MCP Filesystem');
    console.log('6️⃣  ⚙️  Configurar Proveedor de IA (Ollama / Gemini con Google Search)');
    console.log('7️⃣  📂 Cambiar Ubicación del Proyecto (Workspace Root)');
    console.log('0️⃣  ❌ Salir');
    console.log('---------------------------------------------------------------');

    const rl = createPrompt();
    const option = await ask(rl, '👉 Selecciona una opción: ');
    rl.close();

    switch (option) {
      case '1': {
        const promptRl = createPrompt();
        const req = await ask(promptRl, '\n📝 Describe la funcionalidad o requerimiento a implementar: ');
        promptRl.close();
        if (req) {
          console.log('\n🚀 Iniciando Pipeline Completo...');
          try {
            const pipelineResults = await company.runParallelDevPipeline(req);
            console.log('\n===============================================================');
            console.log('📊 RESUMEN DE ENTREGABLES DEL PIPELINE:');
            console.log('===============================================================');
            for (const [phase, output] of Object.entries(pipelineResults)) {
              console.log(`\n🔹 [${phase.toUpperCase()}]`);
              console.log(output.trim().slice(0, 500) + (output.length > 500 ? '\n... (truncado)' : ''));
            }
            console.log('\n===============================================================');
          } catch (err) {
            console.error('Error durante la ejecución del pipeline:', err);
          }
        }
        break;
      }

      case '2': {
        const promptRl = createPrompt();
        const req = await ask(promptRl, '\n📝 Requerimiento técnico para Backend y Frontend: ');
        promptRl.close();
        const inputReq = req || 'Sistema de autenticación con JWT y pantalla de login responsive';
        
        console.log(`\n⚡ Despachando a Backend Dev y Frontend Dev en paralelo para: "${inputReq}"`);
        const devOutputs = await company.executeInParallel([
          {
            roleId: 'backend_developer',
            prompt: `Diseña e implementa endpoints y DTOs para: ${inputReq}.
PASO PREVIO: Si falta el manifiesto (ej. package.json), créalo con write_file usando tooling moderno. Crea los archivos físicamente usando write_file con rutas relativas al proyecto.`
          },
          {
            roleId: 'frontend_developer',
            prompt: `Diseña e implementa componentes UI para: ${inputReq}.
PASO PREVIO: Si falta el manifiesto o template base, créalo con write_file usando Vite (PROHIBIDO react-scripts). Crea los archivos físicamente usando write_file con rutas relativas al proyecto.`
          }
        ]);

        for (const out of devOutputs) {
          console.log(`\n--- 👤 Salida de [${out.agentName}] ---`);
          console.log(out.output.slice(0, 400) + '...\n');
        }

        const integrator = company.getWorker('repo_integrator');
        if (integrator) {
          console.log('🔗 Sincronizando e integrando contratos con Repository Integrator...');
          const intRes = await integrator.executeTask(`Integra estos dos módulos:\nBackend:\n${devOutputs[0]?.output}\n\nFrontend:\n${devOutputs[1]?.output}`);
          console.log('\n--- 🔗 Resultado de Integración ---');
          console.log(intRes.output);
        }
        break;
      }

      case '3': {
        const promptRl = createPrompt();
        const query = await ask(promptRl, '\n🔎 Ingresa tu búsqueda o investigación técnica: ');
        promptRl.close();

        if (query) {
          console.log(`\n🌐 Ejecutando búsqueda web para: "${query}"...`);
          if (currentProvider === 'gemini') {
            console.log('✨ Consultando a R&D Innovation Sentinel con Gemini + Google Search Grounding...');
            const rndLead = company.getWorker('rnd_lead');
            if (rndLead) {
              const res = await rndLead.executeTask(`Investiga a fondo citando fuentes recientes de la web: ${query}`);
              console.log('\n--- 💡 Hallazgos de Investigación (Google Search Grounding) ---');
              console.log(res.output);
            }
          } else {
            console.log('🦆 Consultando DuckDuckGo Web Search Tool (sin API keys)...');
            const results = await WebSearchTool.searchDuckDuckGo(query, 5);
            if (results.length === 0) {
              console.log('No se obtuvieron resultados o hubo un problema de conexión.');
            } else {
              console.log(`\n--- 🌐 Resultados Obtenidos (${results.length}) ---`);
              results.forEach((r, idx) => {
                console.log(`\n[${idx + 1}] ${r.title}`);
                console.log(`    🔗 URL: ${r.url}`);
                console.log(`    📝 ${r.snippet}`);
              });
            }
          }
        }
        break;
      }

      case '4': {
        const workers = company.listWorkers();
        console.log(`\n👥 Squad Activo (${workers.length} Roles Registrados):`);
        for (const w of workers) {
          const worker = company.getWorker(w);
          console.log(`  • [${w}] -> ${worker?.config.name}`);
          console.log(`    Skills: ${worker?.config.requiredSkills.join(', ')}`);
          console.log(`    Modelo: ${worker?.config.defaultModel} (${worker?.config.provider || 'ollama'})`);
        }
        break;
      }

      case '5': {
        console.log(`\n🔌 Verificando Servidor MCP Oficial de FileSystem en: ${company.getWorkspaceRoot()}...`);
        const worker = company.getWorker('lead_developer');
        if (worker) {
          console.log('Ejecutando tarea que interactúa con herramientas MCP...');
          const res = await worker.executeTask('Lista los archivos en el directorio actual usando herramientas MCP');
          console.log(res.output);
        }
        break;
      }

      case '6': {
        const promptRl = createPrompt();
        console.log('\n⚙️ Configuración de Proveedor de Inteligencia Artificial:');
        console.log(' [1] Usar Ollama Local (Modelos: qwen2.5-coder, gemma4)');
        console.log(' [2] Usar Google Gemini (Con Google Search Grounding nativo)');
        const provChoice = await ask(promptRl, 'Selecciona proveedor: ');

        if (provChoice === '2') {
          const keyInput = await ask(promptRl, 'Ingresa GEMINI_API_KEY (deja vacío para usar process.env.GEMINI_API_KEY): ');
          const modelInput = await ask(promptRl, 'Modelo Gemini (default: gemini-2.5-flash): ');
          
          const apiKey = keyInput || process.env.GEMINI_API_KEY;
          const model = modelInput || 'gemini-2.5-flash';

          company.configureAllWorkersGemini({ apiKey, model });
          currentProvider = 'gemini';
          console.log(`\n✅ Proveedor cambiado a Google Gemini (${model}) con Google Search activado!`);
        } else {
          for (const w of company.listWorkers()) {
            company.getWorker(w)?.setProvider('ollama');
          }
          currentProvider = 'ollama';
          console.log('\n✅ Proveedor cambiado a Ollama Local!');
        }
        promptRl.close();
        break;
      }

      case '7': {
        const promptRl = createPrompt();
        console.log(`\n📂 Ubicación actual: ${company.getWorkspaceRoot()}`);
        const newLoc = await ask(promptRl, 'Ingresa la nueva ruta del proyecto (absoluta o relativa): ');
        promptRl.close();

        if (newLoc) {
          const resolvedNewLoc = path.resolve(newLoc);
          if (!fs.existsSync(resolvedNewLoc)) {
            console.log(`⚠️ La ruta "${resolvedNewLoc}" no existe. Se creará...`);
            try {
              fs.mkdirSync(resolvedNewLoc, { recursive: true });
            } catch (err) {
              console.warn(`No se pudo crear la ruta: ${(err as Error).message}`);
            }
          }
          try {
            process.chdir(resolvedNewLoc);
            console.log(`🧭 Entorno de ejecución (CWD) sincronizado a: ${process.cwd()}`);
          } catch (err) {
            console.warn(`⚠️ No se pudo cambiar el CWD del proceso: ${(err as Error).message}`);
          }
          company.setWorkspaceRoot(resolvedNewLoc);
          console.log(`\n✅ Ubicación del proyecto actualizada a: ${company.getWorkspaceRoot()}`);
        }
        break;
      }

      case '0': {
        console.log('\n👋 Cerrando Agile Squad Company. ¡Hasta pronto!');
        return;
      }

      default:
        console.log('\n⚠️ Opción no válida. Por favor selecciona una opción del menú.');
        break;
    }
  }
}

showMenu().catch(err => {
  console.error('Error en inicializador:', err);
});
