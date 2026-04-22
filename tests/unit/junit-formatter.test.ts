import { describe, it, expect } from 'vitest';
import { getFormatter } from '../../src/formatters/index.js';
import type { Finding } from '../../src/domain/finding.js';

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

describe('junit formatter', () => {
  it('produces XML with testsuites root', () => {
    const formatter = getFormatter('junit');
    const output = formatter.format([sampleFinding]);
    expect(output).toContain('<testsuites');
    expect(output).toContain('</testsuites>');
  });

  it('groups findings into testsuite per file', () => {
    const formatter = getFormatter('junit');
    const output = formatter.format([sampleFinding]);
    expect(output).toContain('<testsuite');
    expect(output).toContain('foo.spec.ts');
  });

  it('each finding becomes a testcase with failure', () => {
    const formatter = getFormatter('junit');
    const output = formatter.format([sampleFinding]);
    expect(output).toContain('<testcase');
    expect(output).toContain('<failure');
    expect(output).toContain('no-hard-wait');
    expect(output).toContain('Avoid waitForTimeout()');
  });

  it('empty findings produces empty testsuites', () => {
    const formatter = getFormatter('junit');
    const output = formatter.format([]);
    expect(output).toContain('<testsuites');
    expect(output).not.toContain('<testsuite ');
  });

  it('XML declaration included', () => {
    const formatter = getFormatter('junit');
    const output = formatter.format([sampleFinding]);
    expect(output).toContain('<?xml');
  });
});
