import { SkillRegistry } from '../../src/SkillRegistry';
import * as fs from 'fs';
import * as path from 'path';

describe('SkillRegistry Full Coverage (Unit Tests)', () => {
  it('should instantiate with custom directory if valid', () => {
    const customDir = path.resolve(__dirname, '../../tests');
    const registry = new SkillRegistry(customDir);
    expect(registry).toBeDefined();
  });

  it('should return fallback message when skill is not found on disk', () => {
    const registry = new SkillRegistry('/non/existent/path');
    const content = registry.getSkillPrompt('non-existent-skill');
    expect(content).toContain('[Skill non-existent-skill definition not found on disk');
  });

  it('should read skill file when it exists on disk', () => {
    const tempDir = path.resolve(__dirname, '../../tests/temp_skills');
    const skillFolder = path.join(tempDir, 'dummy-skill');
    fs.mkdirSync(skillFolder, { recursive: true });
    fs.writeFileSync(path.join(skillFolder, 'SKILL.md'), '# Dummy Skill Prompt', 'utf-8');

    const registry = new SkillRegistry(tempDir);
    const content = registry.getSkillPrompt('dummy-skill');
    expect(content).toBe('# Dummy Skill Prompt');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should handle read error gracefully', () => {
    const tempDir = path.resolve(__dirname, '../../tests/temp_skills_err');
    const skillFolder = path.join(tempDir, 'faulty-skill');
    const skillFilePath = path.join(skillFolder, 'SKILL.md');
    // Create directory with the name SKILL.md so readFileSync throws EISDIR
    fs.mkdirSync(skillFilePath, { recursive: true });

    const registry = new SkillRegistry(tempDir);
    const content = registry.getSkillPrompt('faulty-skill');
    expect(content).toContain('[Error loading skill faulty-skill:');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
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

  it('should handle empty skillsDir fallback gracefully when getting prompt', () => {
    const registry = new SkillRegistry('/tmp/non_existent_folder_xyz_123');
    // Force skillsDir to be empty string to test line 26-27
    (registry as any).skillsDir = '';
    const content = registry.getSkillPrompt('any-skill');
    expect(content).toBe('[Skill any-skill loaded as standard role capability]');
  });

  it('should set skillsDir to empty string when neither local nor global exists', () => {
    const mockResolver = {
      exists: (p: string) => false
    };

    const registry = new SkillRegistry(undefined, mockResolver);
    expect((registry as any).skillsDir).toBe('');
  });

  it('should resolve to globalPath when localRepoPath does not exist but global does', () => {
    const mockResolver = {
      exists: (p: string) => p.includes('.gemini')
    };

    const registry = new SkillRegistry(undefined, mockResolver);
    expect((registry as any).skillsDir).toContain('.gemini');
  });

  it('should handle undefined process.env.USERPROFILE gracefully', () => {
    const origUserProfile = process.env.USERPROFILE;
    delete process.env.USERPROFILE;

    const mockResolver = {
      exists: (p: string) => false
    };

    const registry = new SkillRegistry(undefined, mockResolver);
    expect((registry as any).skillsDir).toBe('');

    process.env.USERPROFILE = origUserProfile;
  });
});
