import * as fs from 'fs';
import * as path from 'path';

export class SkillRegistry {
  private skillsDir: string;

  constructor(customSkillsDir?: string, pathResolver?: { exists: (p: string) => boolean }) {
    const checker = pathResolver ? pathResolver.exists : fs.existsSync;

    if (customSkillsDir && checker(customSkillsDir)) {
      this.skillsDir = customSkillsDir;
      return;
    }
    // Check standard paths
    const localRepoPath = path.resolve(__dirname, '../../agile-squad-skills/skills');
    const globalPath = path.join(process.env.USERPROFILE || '', '.gemini/config/skills');

    if (checker(localRepoPath)) {
      this.skillsDir = localRepoPath;
    } else if (checker(globalPath)) {
      this.skillsDir = globalPath;
    } else {
      this.skillsDir = '';
    }
  }

  public getSkillPrompt(skillName: string): string {
    if (!this.skillsDir) {
      return `[Skill ${skillName} loaded as standard role capability]`;
    }

    const skillFilePath = path.join(this.skillsDir, skillName, 'SKILL.md');
    if (!fs.existsSync(skillFilePath)) {
      return `[Skill ${skillName} definition not found on disk, operating with default heuristics]`;
    }

    try {
      return fs.readFileSync(skillFilePath, 'utf-8');
    } catch (err) {
      return `[Error loading skill ${skillName}: ${(err as Error).message}]`;
    }
  }

  public buildSystemPrompt(roleId: string, roleName: string, skills: string[], baseDirectives: string): string {
    const loadedSkills = skills.map(skill => {
      const content = this.getSkillPrompt(skill);
      return `=== SKILL: ${skill} ===\n${content}\n`;
    }).join('\n');

    return `Eres "${roleName}" (${roleId}), un agente autónomo de software que forma parte de una empresa ágil de desarrollo operada por IA.

DIRECTIVAS PRINCIPALES DEL ROL:
${baseDirectives}

TUS HABILIDADES Y PROCEDIMIENTOS INYECTADOS (SKILLS):
${loadedSkills}

REGLAS DE ACTUACIÓN:
1. Respeta fielmente los procedimientos de tus Skills asignados.
2. Aplica Clean Code, Early Returns, y separación estricta de responsabilidades.
3. Sé preciso, profesional, sin rodeos y enfocado en entregar valor verificable.
4. Genera entregables concretos listos para el siguiente agente del Squad.`;
  }
}
