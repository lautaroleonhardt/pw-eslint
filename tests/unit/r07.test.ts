import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRuleOnFixture } from '../helpers/fixture-runner.js';
import { r07NoPagePause } from '../../src/rules/r07-no-page-pause.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r07');

describe('R07: no-page-pause', () => {
  it('fires on page.pause() calls', () => {
    const findings = runRuleOnFixture(r07NoPagePause, `${fixtureDir}/r07-fires.ts`);
    expect(findings).toHaveLength(3);
    findings.forEach((f) => {
      expect(f.ruleId).toBe('no-page-pause');
      expect(f.severity).toBe('error');
      expect(f.message).toContain('page.pause()');
    });
  });

  it('fires on multiple pause calls', () => {
    const findings = runRuleOnFixture(r07NoPagePause, `${fixtureDir}/r07-fires.ts`);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.every((f) => f.message.includes('page.pause()'))).toBe(true);
  });

  it('does not fire on valid code without pause', () => {
    const findings = runRuleOnFixture(r07NoPagePause, `${fixtureDir}/r07-nofire.ts`);
    expect(findings).toHaveLength(0);
  });
});
