import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BUILT_IN_RULES } from '../../src/rules/index.js';
import { runInit } from '../../src/cli/init.js';

function captureInit(options: Parameters<typeof runInit>[0]): {
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
    runInit(options);
  } catch (e) {
    if (!(e instanceof Error) || !e.message.startsWith('__exit_')) throw e;
  } finally {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    (process.exit as unknown) = origExit;
  }

  return { stdout: stdoutChunks.join(''), stderr: stderrChunks.join(''), exitCode };
}

describe('runInit', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pw-eslint-init-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates .pw-eslintrc.json with all 12 rules', () => {
    const configPath = join(tmpDir, '.pw-eslintrc.json');
    const { exitCode } = captureInit({ configPath, cwd: tmpDir });

    expect(exitCode).toBe(0);
    expect(existsSync(configPath)).toBe(true);

    const content = readFileSync(configPath, 'utf-8');
    for (const rule of BUILT_IN_RULES) {
      expect(content).toContain(rule.id);
    }
  });

  it('generated file contains category comments', () => {
    const configPath = join(tmpDir, '.pw-eslintrc.json');
    captureInit({ configPath, cwd: tmpDir });

    const content = readFileSync(configPath, 'utf-8');
    expect(content).toContain('flakiness');
    expect(content).toContain('hygiene');
    expect(content).toContain('style');
    expect(content).toContain('correctness');
  });

  it('does not overwrite existing config', () => {
    const configPath = join(tmpDir, '.pw-eslintrc.json');
    // Write a sentinel file first
    writeFileSync(configPath, '{"sentinel": true}', 'utf-8');

    const { exitCode, stderr } = captureInit({ configPath, cwd: tmpDir });

    expect(exitCode).toBe(0);
    expect(stderr).toContain('already exists');
    // File should be unchanged
    const content = readFileSync(configPath, 'utf-8');
    expect(content).toBe('{"sentinel": true}');
  });

  it('uses cwd as default config location', () => {
    const { exitCode } = captureInit({ cwd: tmpDir });
    expect(exitCode).toBe(0);
    expect(existsSync(join(tmpDir, '.pw-eslintrc.json'))).toBe(true);
  });

  it('writes config to custom path — fails when parent dir does not exist', () => {
    const configPath = join(tmpDir, 'nonexistent-dir', 'config.json');
    const { exitCode, stderr } = captureInit({ configPath, cwd: tmpDir });
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Failed to write');
  });
});
