import { AgentRoleConfig } from './types';
import { SkillRegistry } from './SkillRegistry';
import { AgentWorker } from './AgentWorker';

export class CompanyOrchestrator {
  private workers: Map<string, AgentWorker> = new Map();
  private skillRegistry: SkillRegistry;

  constructor(customSkillsDir?: string) {
    this.skillRegistry = new SkillRegistry(customSkillsDir);
    this.registerDefaultSquad();
  }

  private registerDefaultSquad() {
    const defaultRoles: AgentRoleConfig[] = [
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

    for (const role of defaultRoles) {
      this.workers.set(role.roleId, new AgentWorker(role, this.skillRegistry));
    }
  }

  public getWorker(roleId: string): AgentWorker | undefined {
    return this.workers.get(roleId);
  }

  public listWorkers(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Runs an end-to-end software feature workflow across specialized agents:
   * 1. Product Owner (Refines requirement)
   * 2. Senior Tech Architect (Technical design & DoD)
   * 3. Lead Developer (Code implementation proposal)
   * 4. QA Lead (Test plan & coverage review)
   */
  public async runFeaturePipeline(featureRequest: string): Promise<Record<string, string>> {
    console.log(`\n🚀 [Agile Squad Company] Starting Autonomous Feature Pipeline: "${featureRequest}"\n`);
    const results: Record<string, string> = {};

    // 1. PO Refinement
    const po = this.getWorker('product_owner');
    if (po) {
      console.log(`📋 [1/4] Product Owner Sentinel refining feature...`);
      const poRes = await po.executeTask(`El usuario solicita la siguiente funcionalidad: "${featureRequest}". Depura el requerimiento, redacta la Historia de Usuario en formato ágil (Como/Quiero/Para) y lista los Criterios de Aceptación.`);
      results['1_product_owner'] = poRes.output;
      console.log(`✅ PO refinement completed.\n`);
    }

    // 2. Architect Design
    const architect = this.getWorker('tech_architect');
    if (architect) {
      console.log(`🏛️ [2/4] Senior Tech Architect drafting architecture & DoD...`);
      const archPrompt = `A partir de la especificación de PO:\n${results['1_product_owner']}\n\nDiseña la arquitectura modular, volumetría/consumo, y redacta la Definition of Done (DoD).`;
      const archRes = await architect.executeTask(archPrompt);
      results['2_tech_architect'] = archRes.output;
      console.log(`✅ Architecture specification completed.\n`);
    }

    // 3. Lead Developer Implementation
    const dev = this.getWorker('lead_developer');
    if (dev) {
      console.log(`💻 [3/4] Lead Developer writing clean implementation proposal...`);
      const devPrompt = `Implementa la solución técnica para:\n${results['2_tech_architect']}\n\nAplica Clean Code, TypeScript estricto, Early Returns y sin anidaciones innecesarias.`;
      const devRes = await dev.executeTask(devPrompt);
      results['3_lead_developer'] = devRes.output;
      console.log(`✅ Developer proposal completed.\n`);
    }

    // 4. QA Lead Test Plan
    const qa = this.getWorker('qa_lead');
    if (qa) {
      console.log(`🧪 [4/4] QA Lead auditing code and drafting test pyramid...`);
      const qaPrompt = `Revisa el código propuesto por el desarrollador:\n${results['3_lead_developer']}\n\nDiseña la suite de pruebas unitarias y de integración para garantizar 100% de cobertura y cero regresiones.`;
      const qaRes = await qa.executeTask(qaPrompt);
      results['4_qa_lead'] = qaRes.output;
      console.log(`✅ QA suite audit completed.\n`);
    }

    console.log(`🎉 [Agile Squad Company] Pipeline finished successfully!`);
    return results;
  }
}
