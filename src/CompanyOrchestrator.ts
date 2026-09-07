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

  constructor(options?: SquadSelectionOptions, customSkillsDir?: string) {
    this.skillRegistry = new SkillRegistry(customSkillsDir);
    if (options?.enableMcpTools) {
      this.mcpManager = new McpClientManager(options.workspaceRoot);
    }
    this.registerSquad(options);
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
        name: 'Clean Code Lead Developer',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['clean-code-reviewer'],
        systemPromptBase: 'Desarrollador fullstack senior experto en Clean Architecture, SOLID, DRY y Cláusulas de Guarda.'
      },
      {
        roleId: 'backend_developer',
        name: 'Backend Microservices Developer',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['clean-code-reviewer'],
        systemPromptBase: 'Especialista en desarrollo backend, microservicios, bases de datos y APIs REST/gRPC.'
      },
      {
        roleId: 'frontend_developer',
        name: 'Frontend & UI Developer',
        defaultModel: 'qwen2.5-coder:latest',
        requiredSkills: ['clean-code-reviewer', 'ux-ui-design-sentinel'],
        systemPromptBase: 'Especialista en desarrollo frontend Web/Mobile, reactividad y rendimiento de renderizado.'
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

    for (const role of selectedRoles) {
      this.workers.set(role.roleId, new AgentWorker(role, this.skillRegistry, this.mcpManager));
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
  public async runParallelDevPipeline(featureRequest: string): Promise<Record<string, string>> {
    console.log(`\n🚀 [Agile Squad Company] Starting Parallel Multi-Dev & Integration Pipeline: "${featureRequest}"\n`);
    const results: Record<string, string> = {};

    // 1. PO
    const po = this.getWorker('product_owner');
    if (po) {
      console.log(`📋 [1/5] Product Owner Sentinel refining feature...`);
      const poRes = await po.executeTask(`El usuario solicita la siguiente funcionalidad: "${featureRequest}". Depura el requerimiento, redacta la Historia de Usuario y Criterios de Aceptación.`);
      results['1_product_owner'] = poRes.output;
      console.log(`✅ PO refinement completed.\n`);
    }

    // 2. Architect
    const architect = this.getWorker('tech_architect');
    if (architect) {
      console.log(`🏛️ [2/5] Senior Tech Architect drafting architecture & contracts...`);
      const archPrompt = `A partir de la especificación:\n${results['1_product_owner']}\n\nDiseña la arquitectura modular, contratos de API entre Frontend y Backend, y la Definition of Done (DoD).`;
      const archRes = await architect.executeTask(archPrompt);
      results['2_tech_architect'] = archRes.output;
      console.log(`✅ Architecture specification completed.\n`);
    }

    // 3. PARALLEL EXECUTION: Backend Dev & Frontend Dev
    console.log(`⚡ [3/5] Launching PARALLEL Developers (Backend + Frontend)...`);
    const devTasks = [
      {
        roleId: 'backend_developer',
        prompt: `Basado en la arquitectura:\n${results['2_tech_architect']}\n\nImplementa el servicio Backend, endpoints y persistencia. Usa Clean Code y Early Returns.`
      },
      {
        roleId: 'frontend_developer',
        prompt: `Basado en la arquitectura:\n${results['2_tech_architect']}\n\nImplementa la interfaz de usuario Frontend consumiendo los contratos del backend. Usa Clean Code y estados UI.`
      }
    ];

    const parallelDevResults = await this.executeInParallel(devTasks);
    results['3_backend_developer'] = parallelDevResults[0]?.output || '';
    results['3_frontend_developer'] = parallelDevResults[1]?.output || '';
    console.log(`✅ Both developers completed work in parallel!\n`);

    // 4. REPO INTEGRATOR
    const integrator = this.getWorker('repo_integrator');
    if (integrator) {
      console.log(`🔗 [4/5] Repository & Monorepo Integrator verifying contracts and merging...`);
      const integPrompt = `Se han desarrollado dos módulos en paralelo:\n--- BACKEND ---\n${results['3_backend_developer']}\n\n--- FRONTEND ---\n${results['3_frontend_developer']}\n\nAnaliza la integración entre ambos repositorios/paquetes. Verifica que los contratos de API coincidan, no haya incompatibilidades, y detalla el plan de unificación en el monorepo/rama de integración.`;
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
