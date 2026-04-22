import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r02DeepLocator } from '../../src/rules/r02-deep-locator.js';
import type { ResolvedConfig } from '../../src/domain/config.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r02');

describe('R02: deep-locator', () => {
  it('fires on selectors exceeding maxDepth', () => {
    const findings = runRuleOnFixture(r02DeepLocator, `${fixtureDir}/r02-fires.ts`);
    // 4-combinator CSS, 4-descendant CSS, dynamic template literal, XPath depth > 3
    expect(findings.length).toBeGreaterThanOrEqual(4);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('deep-locator');
      expect(f.severity).toBe('warn');
    });
  });

  it('flags dynamic template literals', () => {
    const findings = runRuleOnFixture(r02DeepLocator, `${fixtureDir}/r02-fires.ts`);
    const dynamic = findings.find((f) => f.message.toLowerCase().includes('dynamic'));
    expect(dynamic).toBeDefined();
  });

  it('does not fire on shallow selectors', () => {
    const findings = runRuleOnFixture(r02DeepLocator, `${fixtureDir}/r02-nofire.ts`);
    expect(findings).toHaveLength(0);
  });

  it('does not fire when depth exactly equals maxDepth', () => {
    // r02-nofire includes a selector with exactly 3 combinators (= maxDepth)
    const findings = runRuleOnFixture(r02DeepLocator, `${fixtureDir}/r02-nofire.ts`);
    expect(findings).toHaveLength(0);
  });

  it('respects custom maxDepth config', () => {
    const config: Partial<ResolvedConfig> = {
      rules: { 'deep-locator': ['warn', { maxDepth: 1 }] },
    };
    const findings = runRuleOnFixture(r02DeepLocator, `${fixtureDir}/r02-nofire.ts`, config);
    // selectors with 2+ combinators should fire when maxDepth = 1
    expect(findings.length).toBeGreaterThan(0);
  });
});
