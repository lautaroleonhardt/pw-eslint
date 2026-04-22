import { describe, it, expect } from 'vitest';
import { compareFindings } from '../../src/engine/baseline-comparator.js';
import type { Finding } from '../../src/domain/finding.js';

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'no-hard-wait',
    severity: 'error',
    filePath: '/project/tests/foo.spec.ts',
    line: 5,
    column: 3,
    message: 'test message',
    fixable: false,
    ...overrides,
  };
}

describe('compareFindings', () => {
  it('categorizes all as unchanged when baseline equals current', () => {
    const f = makeFinding();
    const result = compareFindings([f], [f]);
    expect(result.unchanged).toHaveLength(1);
    expect(result.new).toHaveLength(0);
    expect(result.fixed).toHaveLength(0);
  });

  it('categorizes finding as new when not in baseline', () => {
    const f = makeFinding();
    const result = compareFindings([], [f]);
    expect(result.new).toHaveLength(1);
    expect(result.new[0]).toBe(f);
    expect(result.unchanged).toHaveLength(0);
    expect(result.fixed).toHaveLength(0);
  });

  it('categorizes finding as fixed when in baseline but not current', () => {
    const f = makeFinding();
    const result = compareFindings([f], []);
    expect(result.fixed).toHaveLength(1);
    expect(result.fixed[0]).toBe(f);
    expect(result.new).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
  });

  it('uses (filePath, line, column, ruleId) as key — different line = new finding', () => {
    const baseline = makeFinding({ line: 5 });
    const current = makeFinding({ line: 10 });
    const result = compareFindings([baseline], [current]);
    expect(result.new).toHaveLength(1);
    expect(result.fixed).toHaveLength(1);
    expect(result.unchanged).toHaveLength(0);
  });

  it('uses ruleId as part of key — same location different rule = new finding', () => {
    const baseline = makeFinding({ ruleId: 'no-hard-wait' });
    const current = makeFinding({ ruleId: 'deep-locator' });
    const result = compareFindings([baseline], [current]);
    expect(result.new).toHaveLength(1);
    expect(result.fixed).toHaveLength(1);
  });

  it('computes summary counts correctly', () => {
    const baselineError = makeFinding({ severity: 'error' });
    const baselineWarn = makeFinding({ severity: 'warn', line: 6 });
    const currentError = makeFinding({ severity: 'error', line: 10 }); // new
    const result = compareFindings([baselineError, baselineWarn], [currentError]);
    expect(result.summary.baseline.errors).toBe(1);
    expect(result.summary.baseline.warnings).toBe(1);
    expect(result.summary.current.errors).toBe(1);
    expect(result.summary.current.warnings).toBe(0);
    expect(result.summary.delta.errors).toBe(0); // 1 - 1
    expect(result.summary.delta.warnings).toBe(-1); // 0 - 1
  });

  it('handles empty baseline and empty current', () => {
    const result = compareFindings([], []);
    expect(result.new).toHaveLength(0);
    expect(result.fixed).toHaveLength(0);
    expect(result.unchanged).toHaveLength(0);
    expect(result.summary.baseline.errors).toBe(0);
    expect(result.summary.current.errors).toBe(0);
  });
});
