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

  it('shows rules with 0 findings in the summary table when allRuleIds provided', () => {
    const output = formatPretty(sampleFindings, true, undefined, [
      'no-hard-wait',
      'deep-locator',
      'zombie-locator',
    ]);
    expect(output).toContain('zombie-locator');
  });

  it('renders summary table even when findings is empty but allRuleIds provided', () => {
    const output = formatPretty([], true, undefined, ['no-hard-wait']);
    expect(output).toContain('no-hard-wait');
    expect(output).toContain('No findings');
  });

  it('omits table when both findings and allRuleIds are empty', () => {
    const output = formatPretty([], true);
    expect(output).not.toContain('Rule');
  });

  it('sorts all rule rows alphabetically', () => {
    const output = formatPretty(sampleFindings, true, undefined, [
      'zombie-locator',
      'deep-locator',
      'no-hard-wait',
    ]);
    const tableStart = output.indexOf('┌');
    const tableSection = output.slice(tableStart);
    const deepLocatorPos = tableSection.indexOf('deep-locator');
    const noHardWaitPos = tableSection.indexOf('no-hard-wait');
    const zombiePos = tableSection.indexOf('zombie-locator');
    expect(deepLocatorPos).toBeLessThan(noHardWaitPos);
    expect(noHardWaitPos).toBeLessThan(zombiePos);
  });

  it('does not create duplicate rows for repeated ruleIds in allRuleIds', () => {
    const output = formatPretty([], true, undefined, ['no-hard-wait', 'no-hard-wait']);
    const count = (output.match(/no-hard-wait/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('shows correct counts for rules with findings alongside 0-count rules', () => {
    const output = formatPretty(sampleFindings, true, undefined, [
      'no-hard-wait',
      'deep-locator',
      'zombie-locator',
    ]);
    expect(output).toMatch(/no-hard-wait.*2/); // no-hard-wait: 2 errors
    expect(output).toMatch(/deep-locator.*1/); // deep-locator: 1 warning
    expect(output).toContain('zombie-locator');
  });

  it('shows rule row even when all its findings were filtered out by severity', () => {
    const warnOnlyFindings = sampleFindings.filter((f) => f.severity === 'warn');
    const output = formatPretty(warnOnlyFindings, true, undefined, [
      'no-hard-wait',
      'deep-locator',
    ]);
    expect(output).toContain('no-hard-wait');
  });
});
