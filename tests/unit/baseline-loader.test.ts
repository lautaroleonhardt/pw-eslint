import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadBaseline, BaselineLoadError } from '../../src/infrastructure/baseline-loader.js';

function writeTmp(content: string): string {
  const dir = join(tmpdir(), 'pw-eslint-test-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'baseline.json');
  writeFileSync(file, content, 'utf-8');
  return file;
}

describe('loadBaseline', () => {
  it('loads a valid Finding[] array', () => {
    const finding = {
      ruleId: 'no-hard-wait',
      severity: 'error',
      filePath: '/project/test.spec.ts',
      line: 5,
      column: 3,
      message: 'test',
      fixable: false,
    };
    const file = writeTmp(JSON.stringify([finding]));
    const result = loadBaseline(file);
    expect(result).toHaveLength(1);
    expect(result[0]!.ruleId).toBe('no-hard-wait');
  });

  it('loads an empty array', () => {
    const file = writeTmp('[]');
    const result = loadBaseline(file);
    expect(result).toHaveLength(0);
  });

  it('throws BaselineLoadError for missing file', () => {
    expect(() => loadBaseline('/nonexistent/baseline.json')).toThrow(BaselineLoadError);
  });

  it('throws BaselineLoadError for invalid JSON', () => {
    const file = writeTmp('{ not valid json');
    expect(() => loadBaseline(file)).toThrow(BaselineLoadError);
  });

  it('throws BaselineLoadError when content is not an array', () => {
    const file = writeTmp('{ "findings": [] }');
    expect(() => loadBaseline(file)).toThrow(BaselineLoadError);
  });

  it('throws BaselineLoadError when array contains non-objects', () => {
    const file = writeTmp('[1, 2, 3]');
    expect(() => loadBaseline(file)).toThrow(BaselineLoadError);
  });
});
