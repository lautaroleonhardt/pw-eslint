import { describe, it, expect } from 'vitest';
import { getFormatter } from '../../src/formatters/index.js';
import type { Finding } from '../../src/domain/finding.js';
import type { DiffReport } from '../../src/domain/diff.js';

const sampleFinding: Finding = {
  ruleId: 'no-hard-wait',
  severity: 'error',
  filePath: '/project/tests/foo.spec.ts',
  line: 10,
  column: 5,
  message: 'Avoid waitForTimeout()',
  suggestion: 'Use web-first waiting',
  fixable: true,
};

describe('json formatter', () => {
  it('produces valid JSON', () => {
    const formatter = getFormatter('json');
    const output = formatter.format([sampleFinding]);
    expect(() => {
      JSON.parse(output);
    }).not.toThrow();
  });

  it('output is an array of findings', () => {
    const formatter = getFormatter('json');
    const parsed = JSON.parse(formatter.format([sampleFinding])) as Finding[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('finding fields are preserved', () => {
    const formatter = getFormatter('json');
    const [parsed] = JSON.parse(formatter.format([sampleFinding])) as Finding[];
    expect(parsed!.ruleId).toBe('no-hard-wait');
    expect(parsed!.severity).toBe('error');
    expect(parsed!.line).toBe(10);
    expect(parsed!.message).toBe('Avoid waitForTimeout()');
  });

  it('empty findings produces empty array', () => {
    const formatter = getFormatter('json');
    const parsed = JSON.parse(formatter.format([])) as unknown[];
    expect(parsed).toEqual([]);
  });

  it('includes diff metadata when provided', () => {
    const formatter = getFormatter('json');
    const diff: DiffReport = {
      new: [sampleFinding],
      fixed: [],
      unchanged: [],
      summary: {
        baseline: { errors: 0, warnings: 0 },
        current: { errors: 1, warnings: 0 },
        delta: { errors: 1, warnings: 0 },
      },
    };

    const output = formatter.format([], false, diff);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(output);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(parsed.diff).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(parsed.diff.new).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(parsed.summary.current.errors).toBe(1);
  });
});
