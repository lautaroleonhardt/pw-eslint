import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r06LeakyPageObject } from '../../src/rules/r06-leaky-page-object.js';
import type { ResolvedConfig } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r06');

// Config that treats our fixture dir as spec files
const specConfig: Partial<ResolvedConfig> = {
  specPattern: 'tests/fixtures/r06/**/*.spec.ts',
  pageObjectPattern: 'pages/**/*.ts',
};

describe('R06: leaky-page-object', () => {
  it('fires on direct page access in spec file', () => {
    const findings = runRuleOnFixture(
      r06LeakyPageObject,
      `${fixtureDir}/r06-fires.spec.ts`,
      specConfig,
    );
    expect(findings.length).toBeGreaterThanOrEqual(4);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('leaky-page-object');
      expect(f.severity).toBe('warn');
    });
  });

  it('does not fire when only PO methods are used', () => {
    const findings = runRuleOnFixture(
      r06LeakyPageObject,
      `${fixtureDir}/r06-nofire.spec.ts`,
      specConfig,
    );
    expect(findings).toHaveLength(0);
  });
});
