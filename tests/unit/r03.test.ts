import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r03UnawaitedAction } from '../../src/rules/r03-unawaited-action.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r03');

describe('R03: unawaited-action', () => {
  it('fires on unawaited async method calls', () => {
    const findings = runRuleOnFixture(r03UnawaitedAction, `${fixtureDir}/r03-fires.ts`);
    expect(findings.length).toBeGreaterThanOrEqual(4);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('unawaited-action');
      expect(f.severity).toBe('error');
      expect(f.message).toContain('await');
    });
  });

  it('does not fire on awaited calls', () => {
    const findings = runRuleOnFixture(r03UnawaitedAction, `${fixtureDir}/r03-nofire.ts`);
    expect(findings).toHaveLength(0);
  });

  it('does not fire on Promise.all arguments', () => {
    const findings = runRuleOnFixture(r03UnawaitedAction, `${fixtureDir}/r03-nofire.ts`);
    expect(findings).toHaveLength(0);
  });
});
