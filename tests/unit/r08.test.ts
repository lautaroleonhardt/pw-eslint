import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r08NoFocusedTest } from '../../src/rules/r08-no-focused-test.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r08');

describe('R08: no-focused-test', () => {
  it('fires on test.only() calls', () => {
    const findings = runRuleOnFixture(r08NoFocusedTest, `${fixtureDir}/r08-fires.ts`);
    expect(findings).toHaveLength(3);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-focused-test');
      expect(f.severity).toBe('error');
      expect(f.message).toContain('test.only()');
    });
  });

  it('fires on multiple focused tests', () => {
    const findings = runRuleOnFixture(r08NoFocusedTest, `${fixtureDir}/r08-fires.ts`);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.message.includes('test.only()'))).toBe(true);
  });

  it('does not fire on normal tests', () => {
    const findings = runRuleOnFixture(r08NoFocusedTest, `${fixtureDir}/r08-nofire.ts`);
    expect(findings).toHaveLength(0);
  });
});
