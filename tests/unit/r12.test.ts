import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r12NoSkippedTest } from '../../src/rules/r12-no-skipped-test.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r12');

describe('R12: no-skipped-test', () => {
  it('fires on test.skip() calls', () => {
    const findings = runRuleOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fires.ts`);
    expect(findings).toHaveLength(4);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-skipped-test');
      expect(f.severity).toBe('warn');
      expect(f.message).toContain('test.skip()');
    });
  });

  it('fires on multiple skipped tests', () => {
    const findings = runRuleOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fires.ts`);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.message.includes('test.skip()'))).toBe(true);
  });

  it('does not fire on normal tests', () => {
    const findings = runRuleOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-nofire.ts`);
    expect(findings).toHaveLength(0);
  });

  it('fires on test.fixme() calls', () => {
    const findings = runRuleOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fixme-fires.ts`);
    expect(findings).toHaveLength(3);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-skipped-test');
      expect(f.severity).toBe('warn');
      expect(f.message).toContain('fixme');
    });
  });

  it('fires on it.fixme() and describe.fixme() aliases', () => {
    const findings = runRuleOnFixture(r12NoSkippedTest, `${fixtureDir}/r12-fixme-fires.ts`);
    const messages = findings.map((f) => f.message);
    expect(messages.some((m) => m.includes('fixme'))).toBe(true);
  });
});
