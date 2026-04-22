import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r01NoHardWait } from '../../src/rules/r01-no-hard-wait.js';

// Use existing r01 fixture which has violations
const fixtureDir = resolve(import.meta.dirname, '../fixtures/r01');
const firesFixture = `${fixtureDir}/r01-fires.ts`;

describe('runner: overrides apply per-file severity', () => {
  it('reports error severity by default', () => {
    const findings = runRuleOnFixture(r01NoHardWait, firesFixture);
    expect(findings.length).toBeGreaterThan(0);
    findings.forEach((f) => expect(f.severity).toBe('error'));
  });

  it('overrides severity to warn when file matches override pattern', () => {
    const findings = runRuleOnFixture(r01NoHardWait, firesFixture, {
      overrides: [
        { files: ['**/r01-fires.ts'], rules: { 'no-hard-wait': 'warn' } },
      ],
    });
    expect(findings.length).toBeGreaterThan(0);
    findings.forEach((f) => expect(f.severity).toBe('warn'));
  });

  it('suppresses findings when override sets rule to off', () => {
    const findings = runRuleOnFixture(r01NoHardWait, firesFixture, {
      overrides: [
        { files: ['**/r01-fires.ts'], rules: { 'no-hard-wait': 'off' } },
      ],
    });
    expect(findings).toHaveLength(0);
  });

  it('first matching override wins', () => {
    const findings = runRuleOnFixture(r01NoHardWait, firesFixture, {
      overrides: [
        { files: ['**/r01-fires.ts'], rules: { 'no-hard-wait': 'warn' } },
        { files: ['**/r01-fires.ts'], rules: { 'no-hard-wait': 'off' } }, // should NOT apply
      ],
    });
    expect(findings.length).toBeGreaterThan(0);
    findings.forEach((f) => expect(f.severity).toBe('warn'));
  });

  it('unspecified rules in override inherit global defaults', () => {
    // Override only affects no-hard-wait; other rules unaffected
    const findings = runRuleOnFixture(r01NoHardWait, firesFixture, {
      overrides: [
        { files: ['**/r01-nofire.ts'], rules: { 'no-hard-wait': 'off' } }, // different file
      ],
    });
    // Override doesn't match firesFixture → global error severity applies
    expect(findings.length).toBeGreaterThan(0);
    findings.forEach((f) => expect(f.severity).toBe('error'));
  });
});
