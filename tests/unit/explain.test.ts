import { describe, it, expect } from 'vitest';
import { runExplain } from '../../src/cli/explain.js';
import { BUILT_IN_RULES } from '../../src/rules/index.js';

function captureExplain(ruleId: string, color = false): {
  stdout: string;
  stderr: string;
  exitCode: number;
} {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  let exitCode = 0;

  const origStdout = process.stdout.write.bind(process.stdout);
  const origStderr = process.stderr.write.bind(process.stderr);
  const origExit = process.exit;

  (process.stdout.write as unknown) = (s: string) => { stdoutChunks.push(s); return true; };
  (process.stderr.write as unknown) = (s: string) => { stderrChunks.push(s); return true; };
  (process.exit as unknown) = (code?: number) => { exitCode = code ?? 0; throw new Error(`__exit_${code}`); };

  try {
    runExplain(ruleId, BUILT_IN_RULES, { color });
  } catch (e) {
    if (!(e instanceof Error) || !e.message.startsWith('__exit_')) throw e;
  } finally {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    (process.exit as unknown) = origExit;
  }

  return { stdout: stdoutChunks.join(''), stderr: stderrChunks.join(''), exitCode };
}

describe('runExplain', () => {
  it('prints rule metadata for a known rule', () => {
    const { stdout, exitCode } = captureExplain('no-hard-wait');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('no-hard-wait');
    expect(stdout).toContain('flakiness');
    expect(stdout).toContain('error');
    expect(stdout).toContain('Rationale');
    expect(stdout).toContain('Examples');
    expect(stdout).toContain('Fix Guidance');
  });

  it('exits with code 1 and prints "Rule not found" for unknown rule', () => {
    const { exitCode, stderr } = captureExplain('invalid-rule-xyz');
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Rule not found');
  });

  it('prints table for --list', () => {
    const { stdout, exitCode } = captureExplain('--list');
    expect(exitCode).toBe(0);
    // All 12 rules should appear
    for (const rule of BUILT_IN_RULES) {
      expect(stdout).toContain(rule.id);
    }
    expect(stdout).toContain('Category');
    expect(stdout).toContain('Sev');
  });

  it('is case-insensitive for rule ID', () => {
    const { stdout, exitCode } = captureExplain('NO-HARD-WAIT');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('no-hard-wait');
  });

  it('respects --no-color (no ANSI codes in output)', () => {
    const { stdout } = captureExplain('no-hard-wait', false);
    // No ANSI escape sequences
    expect(stdout).not.toMatch(/\x1b\[/);
  });
});
