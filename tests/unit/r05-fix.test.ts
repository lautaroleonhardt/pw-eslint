import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { Project, ScriptTarget } from 'ts-morph';
import { runFixOnFixture } from '../helpers/fixture-runner.js';
import { r05WebFirstAssertion } from '../../src/rules/r05-web-first-assertion.js';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r05');

describe('R05: web-first-assertion fix', () => {
  it('rewrites isVisible().toBe(true) to toBeVisible()', () => {
    const { text } = runFixOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    expect(text).toContain('await expect(this.btn).toBeVisible()');
  });

  it('rewrites isVisible().toBe(false) to not.toBeVisible()', () => {
    const { text } = runFixOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    expect(text).toContain('await expect(this.btn).not.toBeVisible()');
  });

  it('rewrites isEnabled().toBe(true) to toBeEnabled()', () => {
    const { text } = runFixOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    expect(text).toContain('await expect(this.btn).toBeEnabled()');
  });

  it('does not rewrite toBeTruthy/toBeFalsy (semantic ambiguity)', () => {
    const { text } = runFixOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    expect(text).toContain('toBeTruthy()');
    expect(text).toContain('toBeFalsy()');
  });

  it('fix is idempotent', () => {
    const { text: firstPass } = runFixOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);

    const project = new Project({
      compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
      skipAddingFilesFromTsConfig: true,
    });
    const sf = project.createSourceFile('test-idempotent.ts', firstPass);
    const runner = new RuleRunner([r05WebFirstAssertion], DEFAULT_CONFIG, 'fix');
    runner.run(['test-idempotent.ts'], project);
    const secondPass = sf.getFullText();

    expect(secondPass).toBe(firstPass);
  });

  it('fixable findings are marked fixStatus: fixed', () => {
    const { findings } = runFixOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    const fixable = findings.filter((f) => !f.message.includes('cannot be auto-fixed'));
    expect(fixable.every((f) => f.fixStatus === 'fixed')).toBe(true);
  });
});
