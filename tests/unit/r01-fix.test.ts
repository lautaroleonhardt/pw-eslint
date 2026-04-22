import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { Project, ScriptTarget } from 'ts-morph';
import { runFixOnFixture } from '../helpers/fixture-runner.js';
import { r01NoHardWait } from '../../src/rules/r01-no-hard-wait.js';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r01');

describe('R01: no-hard-wait fix', () => {
  it('replaces waitForTimeout statement with TODO comment', () => {
    const { text } = runFixOnFixture(r01NoHardWait, `${fixtureDir}/r01-fires.ts`);
    // No more waitForTimeout() calls — only the TODO comment remains (which mentions the name)
    expect(text).not.toMatch(/waitForTimeout\s*\(/);
    expect(text).toContain('TODO: replace waitForTimeout with a Playwright web-first waiting mechanism');
  });

  it('all three waitForTimeout calls are fixed', () => {
    const { text } = runFixOnFixture(r01NoHardWait, `${fixtureDir}/r01-fires.ts`);
    const todoCount = (text.match(/TODO: replace waitForTimeout/g) ?? []).length;
    expect(todoCount).toBe(3);
  });

  it('fix is idempotent — applying twice yields same result', () => {
    const { text: firstPass } = runFixOnFixture(r01NoHardWait, `${fixtureDir}/r01-fires.ts`);

    const project = new Project({
      compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
      skipAddingFilesFromTsConfig: true,
    });
    const sf = project.createSourceFile('test-idempotent.ts', firstPass);
    const runner = new RuleRunner([r01NoHardWait], DEFAULT_CONFIG, 'fix');
    runner.run(['test-idempotent.ts'], project);
    const secondPass = sf.getFullText();

    expect(secondPass).toBe(firstPass);
  });

  it('findings are marked fixStatus: fixed', () => {
    const { findings } = runFixOnFixture(r01NoHardWait, `${fixtureDir}/r01-fires.ts`);
    expect(findings.every((f) => f.fixStatus === 'fixed')).toBe(true);
  });
});
