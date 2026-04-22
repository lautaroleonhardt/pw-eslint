import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r01NoHardWait } from '../../src/rules/r01-no-hard-wait.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r01');

describe('R01: no-hard-wait', () => {
  it('fires on waitForTimeout calls', () => {
    const findings = runRuleOnFixture(r01NoHardWait, `${fixtureDir}/r01-fires.ts`);
    expect(findings).toHaveLength(3);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-hard-wait');
      expect(f.severity).toBe('error');
      expect(f.message).toContain('waitForTimeout');
      expect(f.suggestion).toBeDefined();
    });
  });

  it('finds page.waitForTimeout at the correct location', () => {
    const findings = runRuleOnFixture(r01NoHardWait, `${fixtureDir}/r01-fires.ts`);
    const first = findings[0]!;
    expect(first.line).toBe(5);
  });

  it('does not fire on valid waiting calls', () => {
    const findings = runRuleOnFixture(r01NoHardWait, `${fixtureDir}/r01-nofire.ts`);
    expect(findings).toHaveLength(0);
  });
});
