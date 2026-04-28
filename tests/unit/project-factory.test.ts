import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createProject } from '../../src/engine/project-factory.js';

describe('createProject', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pw-eslint-project-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns a ts-morph Project instance', () => {
    const project = createProject(tmpDir);
    expect(project).toBeDefined();
    expect(typeof project.addSourceFileAtPath).toBe('function');
  });

  it('uses tsconfig.json when found in target directory', () => {
    writeFileSync(
      join(tmpDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    );

    const project = createProject(tmpDir);
    expect(project).toBeDefined();
  });

  it('uses tsconfig.json from ancestor directory', () => {
    const childDir = join(tmpDir, 'src', 'tests');
    mkdirSync(childDir, { recursive: true });
    writeFileSync(
      join(tmpDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    );

    const project = createProject(childDir);
    expect(project).toBeDefined();
  });

  it('creates synthetic project when no tsconfig.json exists', () => {
    const project = createProject(tmpDir);
    expect(project).toBeDefined();
    const sf = project.createSourceFile(join(tmpDir, 'test.ts'), 'const x: number = 1;');
    expect(sf.getFullText()).toContain('const x');
  });

  it('can parse TypeScript files after creation', () => {
    const filePath = join(tmpDir, 'sample.spec.ts');
    writeFileSync(
      filePath,
      'import { test } from "@playwright/test";\ntest("demo", async () => {});'
    );

    const project = createProject(tmpDir);
    const sf = project.addSourceFileAtPath(filePath);

    expect(sf.getStatements()).toHaveLength(2);
  });
});
