import { describe, it, expect } from 'vitest';
import { getFormatter } from '../../src/formatters/index.js';
import type { Finding } from '../../src/domain/finding.js';

const errorFinding: Finding = {
  ruleId: 'no-hard-wait',
  severity: 'error',
  filePath: 'src/tests/example.spec.ts',
  line: 42,
  column: 10,
  message: 'Hard-coded wait detected',
  suggestion: 'Use web-first assertions',
  fixable: true,
};

const warnFinding: Finding = {
  ruleId: 'deep-locator',
  severity: 'warn',
  filePath: 'src/tests/deep.spec.ts',
  line: 10,
  column: 5,
  message: 'Selector depth exceeds limit',
  suggestion: undefined,
  fixable: false,
};

describe('github formatter', () => {
  it('formats error finding as ::error annotation', () => {
    const formatter = getFormatter('github');
    const output = formatter.format([errorFinding]);
    expect(output).toContain('::error ');
    expect(output).toContain('file=src/tests/example.spec.ts');
    expect(output).toContain('line=42');
    expect(output).toContain('col=10');
    expect(output).toContain('no-hard-wait');
  });

  it('formats warn finding as ::warning annotation', () => {
    const formatter = getFormatter('github');
    const output = formatter.format([warnFinding]);
    expect(output).toContain('::warning ');
    expect(output).toContain('file=src/tests/deep.spec.ts');
    expect(output).toContain('line=10');
    expect(output).toContain('col=5');
  });

  it('produces one line per finding', () => {
    const formatter = getFormatter('github');
    const output = formatter.format([errorFinding, warnFinding]);
    const lines = output.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(2);
  });

  it('escapes colons in message text', () => {
    const findingWithColon: Finding = {
      ...errorFinding,
      message: 'Wait: 5000ms detected',
    };
    const formatter = getFormatter('github');
    const output = formatter.format([findingWithColon]);
    // The message after the final :: should have : escaped as %3A
    const annotationMessage = output.split('::').pop()!;
    expect(annotationMessage).toContain('%3A');
    expect(annotationMessage).not.toContain('Wait: 5000ms');
  });

  it('returns empty string for no findings', () => {
    const formatter = getFormatter('github');
    const output = formatter.format([]);
    expect(output).toBe('');
  });

  it('annotation format matches GitHub Actions spec', () => {
    const formatter = getFormatter('github');
    const output = formatter.format([errorFinding]);
    // Must match: ::level file=...,line=...,col=...::message
    expect(output).toMatch(/^::error file=.+,line=\d+,col=\d+::.+/);
  });
});
