import { AgentRoleConfig, AgentExecutionResult } from './types';
import { SkillRegistry } from './SkillRegistry';
import { AgentWorker } from './AgentWorker';
import { McpClientManager } from './McpClientManager';

export interface SquadSelectionOptions {
  includeRoles?: string[];
  customWorkers?: AgentRoleConfig[];
  workspaceRoot?: string;
  enableMcpTools?: boolean;
}

export class CompanyOrchestrator {
  private workers: Map<string, AgentWorker> = new Map();
  private skillRegistry: SkillRegistry;
  private mcpManager?: McpClientManager;
  private workspaceRoot: string;

  constructor(options?: SquadSelectionOptions, customSkillsDir?: string) {
    this.workspaceRoot = options?.workspaceRoot || process.cwd();
    this.skillRegistry = new SkillRegistry(customSkillsDir);
    if (options?.enableMcpTools) {
      this.mcpManager = new McpClientManager(this.workspaceRoot);
    }
    this.registerSquad(options);
  }

  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  public setWorkspaceRoot(newPath: string): void {
    this.workspaceRoot = newPath;
    if (this.mcpManager) {
      this.mcpManager.disconnect();
      this.mcpManager = new McpClientManager(this.workspaceRoot);
    }
    for (const worker of this.workers.values()) {
      if (this.mcpManager) {
        worker.setMcpManager(this.mcpManager);
      }
      worker.setWorkspaceRoot(this.workspaceRoot);
    }
  }

  public async dispose(): Promise<void> {
    if (this.mcpManager) {
      await this.mcpManager.disconnect();
    }
  }

  private registerSquad(options?: SquadSelectionOptions) {
    const allCatalogRoles: AgentRoleConfig[] = [
      {
        roleId: 'product_owner',
        name: 'Product Owner Sentinel',
        defaultModel: 'gemma4:e2b',
        requiredSkills: ['product-owner-sentinel'],
        systemPromptBase: 'Especialista en depuración de requerimientos de negocio, historias de usuario e impacto.'
      },
      {
        roleId: 'tech_architect',
        name: 'Senior Tech Architect',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['senior-tech-architect'],
        systemPromptBase: 'Arquitecto y líder técnico senior. Diseña componentes modulares, latencia, red y Definition of Done (DoD).'
      },
      {
        roleId: 'lead_developer',
        name: 'Clean Code & Doc Lead Developer',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['clean-code-reviewer', 'tech-doc-sentinel'],
        systemPromptBase: 'Desarrollador fullstack senior experto en Clean Architecture, SOLID, Cláusulas de Guarda y Documentación Técnica Integral (TSDoc/JSDoc, ADRs, OpenAPI, READMEs).'
      },
      {
        roleId: 'backend_developer',
        name: 'Backend Microservices Developer',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['clean-code-reviewer', 'tech-doc-sentinel'],
        systemPromptBase: 'Especialista en desarrollo backend, microservicios, bases de datos, APIs REST/gRPC, contratos de datos y especificaciones OpenAPI documentadas con TSDoc.'
      },
      {
        roleId: 'frontend_developer',
        name: 'Frontend & UI Developer',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['clean-code-reviewer', 'ux-ui-design-sentinel', 'tech-doc-sentinel'],
        systemPromptBase: 'Especialista en desarrollo frontend Web/Mobile, reactividad, accesibilidad WCAG y documentación de componentes/Storybook con TSDoc.'
      },
      {
        roleId: 'repo_integrator',
        name: 'Repository & Monorepo Integrator',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['repo-integrator-sentinel', 'branch-gitflow-guardian'],
        systemPromptBase: 'Especialista en integración multi-repositorio, sincronización de submódulos, monorepos, resolución de dependencias cruzadas y verificación de contratos de API.'
      },
      {
        roleId: 'branch_manager',
        name: 'Branch & GitFlow Guardian',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['branch-gitflow-guardian'],
        systemPromptBase: 'Administrador de ramas, estrategias GitFlow/Trunk-based, pull requests y resolución de merge conflicts.'
      },
      {
        roleId: 'qa_lead',
        name: 'QA Lead Sentinel',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['qa-lead-sentinel', 'autopark-testing-sentinel'],
        systemPromptBase: 'Aseguramiento de calidad, pirámide de pruebas, 100% de cobertura y validación de compilación.'
      },
      {
        roleId: 'appsec_lead',
        name: 'AppSec & Compliance Sentinel',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['security-appsec-sentinel'],
        systemPromptBase: 'Auditor de seguridad, prevención de fuga de secretos y mitigación OWASP Top 10.'
      },
      {
        roleId: 'rnd_lead',
        name: 'R&D Innovation Sentinel',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['rnd-innovation-sentinel'],
        systemPromptBase: 'Investigación y Desarrollo, exploración de nuevas tecnologías, spikes técnicos y análisis forense de bugs.'
      },
      {
        roleId: 'tech_doc',
        name: 'Technical Documentation Sentinel',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['tech-doc-sentinel'],
        systemPromptBase: 'Especialista en documentación técnica integral, contratos de API vivos (OpenAPI), estándares TSDoc/JSDoc, ADRs y runbooks operativos.'
      },
      {
        roleId: 'release_guardian',
        name: 'Version Bump Guardian',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['version-bump-guardian', 'branch-gitflow-guardian'],
        systemPromptBase: 'Gestión de SemVer, actualización de artefactos y preparación de tags de release.'
      }
    ];

    // Combine with any custom defined workers
    const fullCatalog = [...allCatalogRoles, ...(options?.customWorkers || [])];

    // Filter if the user specified an explicit list of roles
    const selectedRoles = options?.includeRoles && options.includeRoles.length > 0
      ? fullCatalog.filter(r => options.includeRoles!.includes(r.roleId))
      : fullCatalog;

    const peerResolver = (roleId: string) => this.getWorker(roleId);

    for (const role of selectedRoles) {
      this.workers.set(
        role.roleId,
        new AgentWorker(role, this.skillRegistry, this.mcpManager, undefined, this.workspaceRoot, peerResolver)
      );
    }
  }

  public getWorker(roleId: string): AgentWorker | undefined {
    return this.workers.get(roleId);
  }

  public listWorkers(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Configures Gemini dynamically on a specific worker role at any moment.
   */
  public configureWorkerGemini(roleId: string, options: { apiKey?: string; model?: string }): boolean {
    const worker = this.getWorker(roleId);
    if (!worker) return false;
    worker.configureGemini(options);
    return true;
  }

  /**
   * Configures Gemini globally across all squad workers at any moment.
   */
  public configureAllWorkersGemini(options: { apiKey?: string; model?: string }): void {
    for (const worker of this.workers.values()) {
      worker.configureGemini(options);
    }
  }

  /**
   * Dispatches tasks to multiple agent roles concurrently in parallel using Promise.all
   */
  public async executeInParallel(
    tasks: { roleId: string; prompt: string }[]
  ): Promise<AgentExecutionResult[]> {
    console.log(`\n⚡ [Parallel Dispatch] Launching ${tasks.length} agents simultaneously...\n`);

    const promises = tasks.map(async (t) => {
      const worker = this.getWorker(t.roleId);
      if (!worker) {
        return {
          roleId: t.roleId,
          agentName: 'Unknown',
          modelUsed: 'none',
          success: false,
          output: `Worker [${t.roleId}] is not active in the current squad selection.`,
          timestamp: new Date().toISOString()
        };
      }

      console.log(` ▶️ [Started] Agent "${worker.config.name}" (${t.roleId}) executing in background...`);
      const res = await worker.executeTask(t.prompt);
      console.log(` 🏁 [Finished] Agent "${worker.config.name}" completed.`);
      return res;
    });

    return await Promise.all(promises);
  }

  /**
   * Runs an end-to-end software feature workflow with parallel development and integration:
   * 1. PO Refinement
   * 2. Architect Design & Interface Contracts
   * 3. PARALLEL DEVS (Backend Dev + Frontend Dev building simultaneously)
   * 4. REPO INTEGRATOR (Unifying multi-repo / cross-module code and contracts)
   * 5. QA Lead (Auditing integrated suite)
   */
  public async runParallelDevPipeline(
    featureRequest: string,
    branchingStrategy: 'Trunk-Based' | 'GitFlow' | 'GitHub-Flow' | 'GitLab-Flow' = 'GitFlow'
  ): Promise<Record<string, string>> {
    console.log(`\n🚀 [Agile Squad Company] Starting Parallel Multi-Dev & Integration Pipeline: "${featureRequest}" [Strategy: ${branchingStrategy}]\n`);
    const results: Record<string, string> = {};

    // 0. R&D INNOVATION LEAD SPIKE
    const rnd = this.getWorker('rnd_lead');
    if (rnd) {
      console.log(`🔬 [0/6] R&D Innovation Sentinel evaluating technology, best practices & stack...`);
      const rndPrompt = `Investiga y evalúa la viabilidad técnica para la solicitud: "${featureRequest}".
OBLIGATORIO:
1. Define el stack tecnológico moderno idóneo, dependencias vigentes y patrones recomendados directamente con tu autoridad de I+D (no consultes a tech_architect, tú eres el evaluador inicial de I+D).
2. POLÍTICA ANTI-DEPRECACIÓN: Verifica que NO recomiendes herramientas descontinuadas (ej. PROHIBIDO react-scripts, create-react-app, setup.py, tslint). Prescribe alternativas modernas estándar en la industria (ej. Vite para React, Poetry/uv para Python, Cargo para Rust, Go Modules para Go).`;
      const rndRes = await rnd.executeTask(rndPrompt);
      results['0_rnd_lead'] = rndRes.output;
      console.log(`✅ R&D evaluation completed.\n`);
    }

    // 1. PO
    const po = this.getWorker('product_owner');
    if (po) {
      console.log(`📋 [1/6] Product Owner Sentinel refining feature...`);
      const poPrompt = `A partir de la solicitud: "${featureRequest}" y los hallazgos de I+D:\n${results['0_rnd_lead'] || 'Sin spike previo'}\n\nDepura el requerimiento, redacta la Historia de Usuario y Criterios de Aceptación.`;
      const poRes = await po.executeTask(poPrompt);
      results['1_product_owner'] = poRes.output;
      console.log(`✅ PO refinement completed.\n`);
    }

    // 2. Architect
    const architect = this.getWorker('tech_architect');
    if (architect) {
      console.log(`🏛️ [2/6] Senior Tech Architect drafting architecture, structure report & project bootstrap specification...`);
      const archPrompt = `A partir de la especificación:\n${results['1_product_owner']}\n\nDiseña la arquitectura modular, estructura exacta de archivos y carpetas a crear en el workspace (${this.workspaceRoot}), contratos de API entre Frontend y Backend, y la Definition of Done (DoD).
OBLIGATORIO:
1. INFORME DE ESTRUCTURA Y ARQUITECTURA (ARCHITECTURE.md):
   Debes generar y guardar físicamente el archivo 'ARCHITECTURE.md' en la raíz del proyecto usando la herramienta write_file. Este informe debe detallar:
   - Diagrama o árbol de directorios del proyecto y qué componentes van en cada carpeta.
   - Justificación del diseño arquitectónico y contratos de interfaz.
   - Guía de bootstrap y Definition of Done (DoD).
2. Especifica el Manifiesto de Proyecto requerido para el ecosistema tecnológico elegido (ej. package.json en Node/TS, pyproject.toml en Python, Cargo.toml en Rust, go.mod en Go, etc.) con sus dependencias base y scripts de ciclo de vida (build, test, start).
3. POLÍTICA ANTI-DEPRECACIÓN INNEGOCIABLE: Queda TERMINANTEMENTE PROHIBIDO prescribir o usar herramientas descontinuadas u obsoletas (ej. NUNCA uses 'react-scripts' o 'create-react-app'; para React utiliza obligatoriamente Vite ['vite', '@vitejs/plugin-react']; para Python usa 'pyproject.toml'; para TS usa ESLint flat config sin tslint).
4. Detalla los comandos CLI exactos requeridos para inicializar y arrancar el entorno moderno (ej. 'npm create vite@latest', 'npm install', 'poetry init', 'cargo init', etc.).`;
      const archRes = await architect.executeTask(archPrompt);
      results['2_tech_architect'] = archRes.output;
      console.log(`✅ Architecture specification & ARCHITECTURE.md report completed.\n`);
    }

    // 3. PARALLEL EXECUTION: Backend Dev & Frontend Dev
    console.log(`⚡ [3/6] Launching PARALLEL Developers (Backend + Frontend)...`);
    const devTasks = [
      {
        roleId: 'backend_developer',
        prompt: `Basado en la arquitectura y especificación de arranque:\n${results['2_tech_architect']}\n\nPASO PREVIO OBLIGATORIO (BOOTSTRAP):
Si el proyecto aún no tiene archivo manifiesto en la raíz (ej. package.json, pyproject.toml, Cargo.toml, go.mod, etc.), DEBES crearlo usando write_file con la estructura de dependencias y scripts antes de escribir código.
Luego, implementa el servicio Backend, endpoints y persistencia.
IMPORTANTE: Crea los archivos físicamente usando write_file pasando rutas relativas a la raíz del proyecto. No incluyas la ruta absoluta de disco en el argumento "path".`
      },
      {
        roleId: 'frontend_developer',
        prompt: `Basado en la arquitectura y especificación de arranque:\n${results['2_tech_architect']}\n\nPASO PREVIO OBLIGATORIO (BOOTSTRAP FRONTEND):
Si no existen archivos base o package.json, TU MISMO debes crearlos usando la herramienta write_file: crea package.json (con Vite y @vitejs/plugin-react, PROHIBIDO react-scripts), index.html, vite.config.ts, tsconfig.json, y los componentes de interfaz en src/ (ej. src/main.tsx, src/App.tsx).
No te detengas si package.json no existe: créalo inmediatamente con write_file.
IMPORTANTE: Crea los archivos físicamente usando write_file pasando rutas relativas a la raíz del proyecto. No incluyas la ruta absoluta de disco en el argumento "path".`
      }
    ];

    const parallelDevResults = await this.executeInParallel(devTasks);
    results['3_backend_developer'] = parallelDevResults[0]?.output || '';
    results['3_frontend_developer'] = parallelDevResults[1]?.output || '';
    console.log(`✅ Both developers completed work in parallel!\n`);

    // 4. REPO INTEGRATOR
    const integrator = this.getWorker('repo_integrator');
    if (integrator) {
      console.log(`🔗 [4/6] Repository & Monorepo Integrator verifying contracts and merging [Strategy: ${branchingStrategy}]...`);
      const integPrompt = `Se han desarrollado dos módulos en paralelo:\n--- BACKEND ---\n${results['3_backend_developer']}\n\n--- FRONTEND ---\n${results['3_frontend_developer']}\n\nEstrategia de Branching activa: "${branchingStrategy}".\nAnaliza la integración entre ambos repositorios/paquetes. Verifica que los contratos de API coincidan, no haya incompatibilidades, y detalla el plan de ramas, merge y unificación aplicando rigurosamente las reglas de "${branchingStrategy}".`;
      const integRes = await integrator.executeTask(integPrompt);
      results['4_repo_integrator'] = integRes.output;
      console.log(`✅ Integration validation completed.\n`);
    }

    // 5. QA
    const qa = this.getWorker('qa_lead');
    if (qa) {
      console.log(`🧪 [5/5] QA Lead auditing integrated solution...`);
      const qaPrompt = `Revisa el reporte de integración y los módulos:\n${results['4_repo_integrator']}\n\nDiseña las pruebas e2e y suites de integración para certificar que el despliegue es 100% confiable.`;
      const qaRes = await qa.executeTask(qaPrompt);
      results['5_qa_lead'] = qaRes.output;
      console.log(`✅ QA certification completed.\n`);
    }

    console.log(`🎉 [Agile Squad Company] Parallel Multi-Dev Pipeline finished successfully!`);
    return results;
  }
}
