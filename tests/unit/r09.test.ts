import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r09NoHardcodedBaseUrl } from '../../src/rules/r09-no-hardcoded-base-url.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r09');

describe('R09: no-hardcoded-base-url', () => {
  it('fires on hardcoded HTTP/HTTPS URLs', () => {
    const findings = runRuleOnFixture(r09NoHardcodedBaseUrl, `${fixtureDir}/r09-fires.ts`);
    expect(findings).toHaveLength(3);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-hardcoded-base-url');
      expect(f.severity).toBe('warn');
      expect(f.message).toContain('Hardcoded URL');
    });
  });

  it('fires on multiple hardcoded URLs', () => {
    const findings = runRuleOnFixture(r09NoHardcodedBaseUrl, `${fixtureDir}/r09-fires.ts`);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.message.includes('Hardcoded URL'))).toBe(true);
  });

  it('does not fire on relative or template literal URLs', () => {
    const findings = runRuleOnFixture(r09NoHardcodedBaseUrl, `${fixtureDir}/r09-nofire.ts`);
    expect(findings).toHaveLength(0);
  });
});
