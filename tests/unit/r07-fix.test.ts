import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { Project, ScriptTarget } from 'ts-morph';
import { runFixOnFixture } from '../helpers/fixture-runner.js';
import { r07NoPagePause } from '../../src/rules/r07-no-page-pause.js';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r07');

describe('R07: no-page-pause fix', () => {
  it('removes all page.pause() statements', () => {
    const { text } = runFixOnFixture(r07NoPagePause, `${fixtureDir}/r07-fires.ts`);
    expect(text).not.toMatch(/\.pause\s*\(/);
  });

  it('all findings are marked fixStatus: fixed', () => {
    const { findings } = runFixOnFixture(r07NoPagePause, `${fixtureDir}/r07-fires.ts`);
    expect(findings.every((f) => f.fixStatus === 'fixed')).toBe(true);
  });

  it('fix is idempotent — applying twice yields same result', () => {
    const { text: firstPass } = runFixOnFixture(r07NoPagePause, `${fixtureDir}/r07-fires.ts`);

    const project = new Project({
      compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
      skipAddingFilesFromTsConfig: true,
    });
    const sf = project.createSourceFile('test-idempotent.ts', firstPass);
    const runner = new RuleRunner([r07NoPagePause], DEFAULT_CONFIG, 'dry-run');
    runner.run(['test-idempotent.ts'], project);
    const secondPass = sf.getFullText();

    expect(secondPass).toBe(firstPass);
  });

  it('result is valid TypeScript (no syntax errors after fix)', () => {
    const { text } = runFixOnFixture(r07NoPagePause, `${fixtureDir}/r07-fires.ts`);
    expect(text).toContain('await page.goto');
    expect(text).toContain('await page.click');
  });
});
