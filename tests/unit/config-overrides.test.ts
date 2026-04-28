import { describe, it, expect, vi, afterEach } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, ConfigValidationError } from '../../src/infrastructure/config-loader.js';

function writeConfig(dir: string, content: object): string {
  mkdirSync(dir, { recursive: true });
  // Write package.json so config search stops here
  writeFileSync(join(dir, 'package.json'), '{}', 'utf-8');
  const configPath = join(dir, '.pw-eslintrc.json');
  writeFileSync(configPath, JSON.stringify(content), 'utf-8');
  return dir;
}

function tmpDir(): string {
  return join(tmpdir(), 'pw-eslint-overrides-' + Date.now());
}

describe('config overrides validation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a valid overrides array', () => {
    const dir = tmpDir();
    writeConfig(dir, {
      overrides: [{ files: ['tests/legacy/**'], rules: { 'no-hard-wait': 'off' } }],
    });
    const config = loadConfig(dir);
    expect(config.overrides).toHaveLength(1);
    expect(config.overrides![0]!.files).toEqual(['tests/legacy/**']);
    expect(config.overrides![0]!.rules['no-hard-wait']).toBe('off');
  });

  it('throws ConfigValidationError for invalid override severity', () => {
    const dir = tmpDir();
    writeConfig(dir, {
      overrides: [{ files: ['tests/**'], rules: { 'no-hard-wait': 'invalid' } }],
    });
    expect(() => loadConfig(dir)).toThrow(ConfigValidationError);
  });

  it('throws ConfigValidationError when overrides is not an array', () => {
    const dir = tmpDir();
    writeConfig(dir, { overrides: { files: ['tests/**'], rules: {} } });
    expect(() => loadConfig(dir)).toThrow(ConfigValidationError);
  });

  it('throws ConfigValidationError when override missing files', () => {
    const dir = tmpDir();
    writeConfig(dir, {
      overrides: [{ rules: { 'no-hard-wait': 'off' } }],
    });
    expect(() => loadConfig(dir)).toThrow(ConfigValidationError);
  });

  it('throws ConfigValidationError when override missing rules', () => {
    const dir = tmpDir();
    writeConfig(dir, {
      overrides: [{ files: ['tests/**'] }],
    });
    expect(() => loadConfig(dir)).toThrow(ConfigValidationError);
  });

  it('throws ConfigValidationError for override with invalid glob pattern', () => {
    const dir = tmpDir();
    writeConfig(dir, {
      overrides: [
        { files: ['[invalid-glob'], rules: { 'no-hard-wait': 'off' } },
        { files: ['tests/valid/**'], rules: { 'no-hard-wait': 'warn' } },
      ],
    });
    expect(() => loadConfig(dir)).toThrow(ConfigValidationError);
  });

  it('returns empty overrides array when not specified', () => {
    const dir = tmpDir();
    writeConfig(dir, {});
    const config = loadConfig(dir);
    expect(config.overrides ?? []).toEqual([]);
  });
});
