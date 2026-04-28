import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r14NoTestWithoutAssertion } from '../../src/rules/r14-no-test-without-assertion.js';
import type { ResolvedConfig } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r14');

const specConfig: Partial<ResolvedConfig> = {
  specPattern: 'tests/fixtures/r14/**/*.ts',
};

describe('R14: no-test-without-assertion', () => {
  it('fires on test() and it() with no expect call', () => {
    const findings = runRuleOnFixture(
      r14NoTestWithoutAssertion,
      `${fixtureDir}/r14-fires.ts`,
      specConfig
    );
    expect(findings).toHaveLength(3);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-test-without-assertion');
      expect(f.severity).toBe('warn');
    });
  });

  it('does not fire on tests with expect, test.todo, test.skip', () => {
    const findings = runRuleOnFixture(
      r14NoTestWithoutAssertion,
      `${fixtureDir}/r14-nofire.ts`,
      specConfig
    );
    expect(findings).toHaveLength(0);
  });

  it('does not fire when file does not match specPattern (scope gate)', () => {
    const findings = runRuleOnFixture(r14NoTestWithoutAssertion, `${fixtureDir}/r14-fires.ts`, {
      specPattern: '**/*.spec.ts',
    });
    expect(findings).toHaveLength(0);
  });
});
