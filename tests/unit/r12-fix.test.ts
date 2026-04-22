import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { Project, ScriptTarget } from 'ts-morph';
import { runFixOnFixture } from '../helpers/fixture-runner.js';
import { r12NoSkippedTest } from '../../src/rules/r12-no-skipped-test.js';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r12');

describe('R12: no-skipped-test fix', () => {
  it('removes .skip modifier from test.skip()', () => {
    const { text } = runFixOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fires.ts`);
    expect(text).not.toMatch(/\btest\.skip\s*\(/);
    expect(text).not.toMatch(/\bit\.skip\s*\(/);
    expect(text).not.toMatch(/\bdescribe\.skip\s*\(/);
  });

  it('preserves test arguments after removing .skip', () => {
    const { text } = runFixOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fires.ts`);
    expect(text).toMatch(/test\s*\(/);
  });

  it('all findings are marked fixStatus: fixed', () => {
    const { findings } = runFixOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fires.ts`);
    expect(findings.every((f) => f.fixStatus === 'fixed')).toBe(true);
  });

  it('fix is idempotent — applying twice yields same result', () => {
    const { text: firstPass } = runFixOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fires.ts`);

    const project = new Project({
      compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
      skipAddingFilesFromTsConfig: true,
    });
    const sf = project.createSourceFile('test-idempotent.ts', firstPass);
    const runner = new RuleRunner([r12NoSkippedTest], DEFAULT_CONFIG, 'dry-run');
    runner.run(['test-idempotent.ts'], project);
    const secondPass = sf.getFullText();

    expect(secondPass).toBe(firstPass);
  });

  it('removes .fixme modifier from test.fixme()', () => {
    const { text } = runFixOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fixme-fires.ts`);
    expect(text).not.toMatch(/\btest\.fixme\s*\(/);
    expect(text).not.toMatch(/\bit\.fixme\s*\(/);
    expect(text).not.toMatch(/\bdescribe\.fixme\s*\(/);
  });

  it('fixme findings are marked fixStatus: fixed', () => {
    const { findings } = runFixOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fixme-fires.ts`);
    expect(findings.every((f) => f.fixStatus === 'fixed')).toBe(true);
  });
});
