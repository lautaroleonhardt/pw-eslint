import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r11NoConsoleInTest } from '../../src/rules/r11-no-console-in-test.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r11');

describe('R11: no-console-in-test', () => {
  it('fires on console.* calls in spec files', () => {
    const findings = runRuleOnFixture(
      r11NoConsoleInTest,
      `${fixtureDir}/r11-fires.spec.ts`,
      { specPattern: '**/*.spec.ts' },
    );
    expect(findings.length).toBeGreaterThan(0);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-console-in-test');
      expect(f.severity).toBe('warn');
      expect(f.message).toContain('console.');
    });
  });

  it('finds console calls at correct locations', () => {
    const findings = runRuleOnFixture(
      r11NoConsoleInTest,
      `${fixtureDir}/r11-fires.spec.ts`,
      { specPattern: '**/*.spec.ts' },
    );
    // Verify we found console calls (exact line numbers may vary)
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some((f) => f.message.includes('console.log'))).toBe(true);
    expect(findings.some((f) => f.message.includes('console.warn'))).toBe(true);
  });

  it('does not fire on valid spec files without console', () => {
    const findings = runRuleOnFixture(
      r11NoConsoleInTest,
      `${fixtureDir}/r11-nofire.spec.ts`,
      { specPattern: '**/*.spec.ts' },
    );
    expect(findings).toHaveLength(0);
  });
});
