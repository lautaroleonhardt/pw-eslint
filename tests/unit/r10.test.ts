import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r10NoHardcodedTimeout } from '../../src/rules/r10-no-hardcoded-timeout.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r10');

describe('R10: no-hardcoded-timeout', () => {
  it('fires on hardcoded numeric timeout values', () => {
    const findings = runRuleOnFixture(r10NoHardcodedTimeout, `${fixtureDir}/r10-fires.ts`);
    expect(findings.length).toBeGreaterThan(0);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-hardcoded-timeout');
      expect(f.severity).toBe('warn');
      expect(f.message).toContain('Hardcoded timeout');
    });
  });

  it('fires on multiple hardcoded timeouts', () => {
    const findings = runRuleOnFixture(r10NoHardcodedTimeout, `${fixtureDir}/r10-fires.ts`);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.message.includes('Hardcoded timeout'))).toBe(true);
  });

  it('does not fire on variable or missing timeouts', () => {
    const findings = runRuleOnFixture(r10NoHardcodedTimeout, `${fixtureDir}/r10-nofire.ts`);
    expect(findings).toHaveLength(0);
  });

  it('maxTimeout: 0 (default) fires on all hardcoded timeouts', () => {
    const findings = runRuleOnFixture(
      r10NoHardcodedTimeout,
      `${fixtureDir}/r10-max-timeout.ts`,
      { rules: { ...DEFAULT_CONFIG.rules, 'no-hardcoded-timeout': ['warn', { maxTimeout: 0 }] } },
    );
    expect(findings).toHaveLength(4);
  });

  it('maxTimeout: 5000 suppresses timeouts <= 5000ms', () => {
    const findings = runRuleOnFixture(
      r10NoHardcodedTimeout,
      `${fixtureDir}/r10-max-timeout.ts`,
      { rules: { ...DEFAULT_CONFIG.rules, 'no-hardcoded-timeout': ['warn', { maxTimeout: 5000 }] } },
    );
    // 3000 and 1000 are suppressed; 30000 and 60000 still fire
    expect(findings).toHaveLength(2);
    findings.forEach((f) => {
      const ms = parseInt(f.message.match(/(\d+)ms/)?.[1] ?? '0', 10);
      expect(ms).toBeGreaterThan(5000);
    });
  });

  it('maxTimeout: 60000 suppresses all timeouts in fixture', () => {
    const findings = runRuleOnFixture(
      r10NoHardcodedTimeout,
      `${fixtureDir}/r10-max-timeout.ts`,
      { rules: { ...DEFAULT_CONFIG.rules, 'no-hardcoded-timeout': ['warn', { maxTimeout: 60000 }] } },
    );
    expect(findings).toHaveLength(0);
  });

  it('invalid maxTimeout (negative) falls back to default (flags all)', () => {
    const findings = runRuleOnFixture(
      r10NoHardcodedTimeout,
      `${fixtureDir}/r10-max-timeout.ts`,
      { rules: { ...DEFAULT_CONFIG.rules, 'no-hardcoded-timeout': ['warn', { maxTimeout: -1 }] } },
    );
    expect(findings).toHaveLength(4);
  });
});
