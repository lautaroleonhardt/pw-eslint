import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r13NoAssertionInPageObject } from '../../src/rules/r13-no-assertion-in-page-object.js';
import type { ResolvedConfig } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r13');

const poConfig: Partial<ResolvedConfig> = {
  pageObjectPattern: 'tests/fixtures/r13/**/*.ts',
};

describe('R13: no-assertion-in-page-object', () => {
  it('fires on expect(), expect.soft(), expect.poll() in page object', () => {
    const findings = runRuleOnFixture(
      r13NoAssertionInPageObject,
      `${fixtureDir}/r13-fires.ts`,
      poConfig,
    );
    expect(findings).toHaveLength(3);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-assertion-in-page-object');
      expect(f.severity).toBe('warn');
    });
  });

  it('does not fire on someLib.expect() in page object', () => {
    const findings = runRuleOnFixture(
      r13NoAssertionInPageObject,
      `${fixtureDir}/r13-nofire.ts`,
      poConfig,
    );
    expect(findings).toHaveLength(0);
  });

  it('does not fire when file does not match pageObjectPattern (scope gate)', () => {
    const findings = runRuleOnFixture(
      r13NoAssertionInPageObject,
      `${fixtureDir}/r13-fires.ts`,
      { pageObjectPattern: 'pages/**/*.ts' },
    );
    expect(findings).toHaveLength(0);
  });
});
