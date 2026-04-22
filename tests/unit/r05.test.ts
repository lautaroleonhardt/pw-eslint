import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r05WebFirstAssertion } from '../../src/rules/r05-web-first-assertion.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r05');

describe('R05: web-first-assertion', () => {
  it('fires on non-web-first assertion patterns', () => {
    const findings = runRuleOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    expect(findings.length).toBeGreaterThanOrEqual(8);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('web-first-assertion');
      expect(f.severity).toBe('error');
    });
  });

  it('reports correct suggestion for isVisible + true', () => {
    const findings = runRuleOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    const f = findings.find((f) => f.message.includes('isVisible') && f.message.includes('true'));
    expect(f?.suggestion).toContain('toBeVisible()');
  });

  it('reports correct suggestion for isVisible + false', () => {
    const findings = runRuleOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    const f = findings.find((f) => f.message.includes('isVisible') && f.message.includes('false'));
    expect(f?.suggestion).toContain('not.toBeVisible()');
  });

  it('flags toBeTruthy/toBeFalsy as not auto-fixable', () => {
    const findings = runRuleOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-fires.ts`);
    const truthy = findings.find((f) => f.message.includes('toBeTruthy'));
    expect(truthy).toBeDefined();
    expect(truthy?.message).toContain('cannot be auto-fixed');
  });

  it('does not fire on web-first assertions', () => {
    const findings = runRuleOnFixture(r05WebFirstAssertion, `${fixtureDir}/r05-nofire.ts`);
    expect(findings).toHaveLength(0);
  });
});
