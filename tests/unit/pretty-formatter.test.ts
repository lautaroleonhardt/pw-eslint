import { describe, it, expect } from 'vitest';
import { formatPretty } from '../../src/formatters/pretty.js';
import type { Finding } from '../../src/domain/finding.js';

const sampleFindings: Finding[] = [
  {
    ruleId: 'no-hard-wait',
    severity: 'error',
    filePath: '/project/tests/login.spec.ts',
    line: 12,
    column: 5,
    message: 'Avoid waitForTimeout()',
    suggestion: 'Use waitForSelector() instead.',
    fixable: true,
  },
  {
    ruleId: 'deep-locator',
    severity: 'warn',
    filePath: '/project/tests/login.spec.ts',
    line: 20,
    column: 3,
    message: 'Selector depth (4) exceeds maxDepth (3).',
    suggestion: 'Simplify your selector.',
    fixable: false,
  },
  {
    ruleId: 'no-hard-wait',
    severity: 'error',
    filePath: '/project/tests/home.spec.ts',
    line: 5,
    column: 1,
    message: 'Avoid waitForTimeout()',
    fixable: true,
  },
];

describe('pretty formatter', () => {
  it('includes file paths', () => {
    const output = formatPretty(sampleFindings, true);
    expect(output).toContain('/project/tests/login.spec.ts');
    expect(output).toContain('/project/tests/home.spec.ts');
  });

  it('includes line:column locations', () => {
    const output = formatPretty(sampleFindings, true);
    expect(output).toContain('12:5');
    expect(output).toContain('20:3');
  });

  it('includes rule IDs', () => {
    const output = formatPretty(sampleFindings, true);
    expect(output).toContain('no-hard-wait');
    expect(output).toContain('deep-locator');
  });

  it('includes severity labels', () => {
    const output = formatPretty(sampleFindings, true);
    expect(output).toContain('error');
    expect(output).toContain('warn');
  });

  it('includes suggestions when present', () => {
    const output = formatPretty(sampleFindings, true);
    expect(output).toContain('Use waitForSelector() instead.');
    expect(output).toContain('Simplify your selector.');
  });

  it('includes summary table with rule counts', () => {
    const output = formatPretty(sampleFindings, true);
    expect(output).toContain('no-hard-wait');
    expect(output).toContain('deep-locator');
  });

  it('outputs no findings message when list is empty', () => {
    const output = formatPretty([], true);
    expect(output).toContain('No findings');
  });

  it('shows error and warning summary counts', () => {
    const output = formatPretty(sampleFindings, true);
    expect(output).toContain('2 errors');
    expect(output).toContain('1 warning');
  });
});
