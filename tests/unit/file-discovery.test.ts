import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { discoverFiles, FileNotFoundError } from '../../src/engine/file-discovery.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';

describe('discoverFiles', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pw-eslint-discovery-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('throws FileNotFoundError when path does not exist', async () => {
    await expect(discoverFiles(join(tmpDir, 'nope.ts'), DEFAULT_CONFIG)).rejects.toThrow(
      FileNotFoundError
    );
  });

  it('returns single file when target is a file', async () => {
    const file = join(tmpDir, 'test.spec.ts');
    writeFileSync(file, 'test("a", () => {});');

    const result = await discoverFiles(file, DEFAULT_CONFIG);

    expect(result).toEqual([file]);
  });

  it('discovers files matching include patterns in a directory', async () => {
    const specFile = join(tmpDir, 'login.spec.ts');
    const otherFile = join(tmpDir, 'utils.ts');
    writeFileSync(specFile, 'test("a", () => {});');
    writeFileSync(otherFile, 'export const x = 1;');

    const config = {
      ...DEFAULT_CONFIG,
      include: ['**/*.spec.ts'],
      exclude: [],
    };

    const result = await discoverFiles(tmpDir, config);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('login.spec.ts');
  });

  it('excludes files matching exclude patterns', async () => {
    mkdirSync(join(tmpDir, 'node_modules'), { recursive: true });
    writeFileSync(join(tmpDir, 'a.spec.ts'), '');
    writeFileSync(join(tmpDir, 'node_modules', 'b.spec.ts'), '');

    const config = {
      ...DEFAULT_CONFIG,
      include: ['**/*.spec.ts'],
      exclude: ['**/node_modules/**'],
    };

    const result = await discoverFiles(tmpDir, config);

    expect(result).toHaveLength(1);
    expect(result[0]).toContain('a.spec.ts');
  });

  it('returns absolute paths', async () => {
    writeFileSync(join(tmpDir, 'foo.spec.ts'), '');
    const config = { ...DEFAULT_CONFIG, include: ['**/*.spec.ts'], exclude: [] };

    const result = await discoverFiles(tmpDir, config);

    expect(result.every((p) => p.startsWith('/'))).toBe(true);
  });
});
