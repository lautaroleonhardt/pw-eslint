import { describe, it, expect } from 'vitest';
import * as api from '../../src/index.js';

describe('public API exports', () => {
  it('exports RuleRunner class', () => {
    expect(api.RuleRunner).toBeDefined();
    expect(typeof api.RuleRunner).toBe('function');
  });

  it('exports BUILT_IN_RULES array with 14 rules', () => {
    expect(Array.isArray(api.BUILT_IN_RULES)).toBe(true);
    expect(api.BUILT_IN_RULES).toHaveLength(14);
  });

  it('exports DEFAULT_CONFIG object', () => {
    expect(api.DEFAULT_CONFIG).toBeDefined();
    expect(api.DEFAULT_CONFIG.rules).toBeDefined();
    expect(api.DEFAULT_CONFIG.include).toBeDefined();
  });

  it('exports loadConfig function', () => {
    expect(typeof api.loadConfig).toBe('function');
  });

  it('exports loadCustomRules function', () => {
    expect(typeof api.loadCustomRules).toBe('function');
  });

  it('exports ConfigValidationError class', () => {
    expect(api.ConfigValidationError).toBeDefined();
  });

  it('exports PluginLoadError class', () => {
    expect(api.PluginLoadError).toBeDefined();
  });

  it('exports PluginApiVersionError class', () => {
    expect(api.PluginApiVersionError).toBeDefined();
  });

  it('exports SUPPORTED_API_VERSION constant', () => {
    expect(typeof api.SUPPORTED_API_VERSION).toBe('number');
    expect(api.SUPPORTED_API_VERSION).toBe(1);
  });

  it('BUILT_IN_RULES contains all expected rule IDs', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    const ruleIds = api.BUILT_IN_RULES.map((r: any) => r.id);
    expect(ruleIds).toEqual(
      expect.arrayContaining([
        'no-hard-wait',
        'deep-locator',
        'unawaited-action',
        'zombie-locator',
        'web-first-assertion',
        'leaky-page-object',
        'no-page-pause',
        'no-focused-test',
        'no-hardcoded-base-url',
        'no-hardcoded-timeout',
        'no-console-in-test',
        'no-skipped-test',
        'no-assertion-in-page-object',
        'no-test-without-assertion',
      ])
    );
  });
});
