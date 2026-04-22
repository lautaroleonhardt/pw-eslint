import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { Project, ScriptTarget } from 'ts-morph';
import { runFixOnFixture } from '../helpers/fixture-runner.js';
import { r08NoFocusedTest } from '../../src/rules/r08-no-focused-test.js';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r08');

describe('R08: no-focused-test fix', () => {
  it('removes .only modifier from test.only()', () => {
    const { text } = runFixOnFixture(r08NoFocusedTest, `${fixtureDir}/r08-fires.ts`);
    expect(text).not.toMatch(/\.(only)\s*\(/);
  });

  it('preserves test arguments after removing .only', () => {
    const { text } = runFixOnFixture(r08NoFocusedTest, `${fixtureDir}/r08-fires.ts`);
    expect(text).toMatch(/test\s*\(/);
    expect(text).toMatch(/it\s*\(/);
    expect(text).toMatch(/describe\s*\(/);
  });

  it('all findings are marked fixStatus: fixed', () => {
    const { findings } = runFixOnFixture(r08NoFocusedTest, `${fixtureDir}/r08-fires.ts`);
    expect(findings.every((f) => f.fixStatus === 'fixed')).toBe(true);
  });

  it('fix is idempotent — applying twice yields same result', () => {
    const { text: firstPass } = runFixOnFixture(r08NoFocusedTest, `${fixtureDir}/r08-fires.ts`);

    const project = new Project({
      compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
      skipAddingFilesFromTsConfig: true,
    });
    const sf = project.createSourceFile('test-idempotent.ts', firstPass);
    const runner = new RuleRunner([r08NoFocusedTest], DEFAULT_CONFIG, 'dry-run');
    runner.run(['test-idempotent.ts'], project);
    const secondPass = sf.getFullText();

    expect(secondPass).toBe(firstPass);
  });
});
