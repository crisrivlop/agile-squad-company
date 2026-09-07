import { SkillRegistry } from '../../src/SkillRegistry';
import * as path from 'path';

describe('SkillRegistry (Unit Tests)', () => {
  it('should instantiate with default skills resolution', () => {
    const registry = new SkillRegistry();
    expect(registry).toBeDefined();
  });

  it('should return fallback message when skill is not found on disk', () => {
    const registry = new SkillRegistry('/non/existent/path');
    const content = registry.getSkillPrompt('non-existent-skill');
    expect(content).toContain('[Skill non-existent-skill');
  });

  it('should build a structured system prompt containing role name and directives', () => {
    const registry = new SkillRegistry();
    const prompt = registry.buildSystemPrompt(
      'qa_lead',
      'QA Lead Sentinel',
      ['qa-lead-sentinel'],
      'Garantiza 100% de cobertura de pruebas.'
    );

    expect(prompt).toContain('QA Lead Sentinel');
    expect(prompt).toContain('qa_lead');
    expect(prompt).toContain('Garantiza 100% de cobertura de pruebas.');
    expect(prompt).toContain('REGLAS DE ACTUACIÓN:');
  });
});
