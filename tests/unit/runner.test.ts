import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Project, ScriptTarget } from 'ts-morph';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';
import { r01NoHardWait } from '../../src/rules/r01-no-hard-wait.js';
import { r05WebFirstAssertion } from '../../src/rules/r05-web-first-assertion.js';
import type { RuleDefinition } from '../../src/domain/rule.js';

function makeProject(): Project {
  return new Project({
    compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
    skipAddingFilesFromTsConfig: true,
  });
}

describe('RuleRunner', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pw-eslint-runner-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty findings for clean files', () => {
    const file = join(tmpDir, 'clean.spec.ts');
    writeFileSync(file, 'import { test } from "@playwright/test";\ntest("ok", async () => {});');
    const project = makeProject();
    project.addSourceFileAtPath(file);
    const runner = new RuleRunner([r01NoHardWait], DEFAULT_CONFIG);
    const { findings } = runner.run([file], project);
    expect(findings).toHaveLength(0);
  });

  it('returns findings for violating files', () => {
    const file = join(tmpDir, 'bad.spec.ts');
    writeFileSync(file, 'import { test } from "@playwright/test";\ntest("wait", async ({ page }) => { await page.waitForTimeout(5000); });');
    const project = makeProject();
    project.addSourceFileAtPath(file);
    const runner = new RuleRunner([r01NoHardWait], DEFAULT_CONFIG);
    const { findings } = runner.run([file], project);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].ruleId).toBe('no-hard-wait');
  });

  it('runs multiple rules on same file', () => {
    const file = join(tmpDir, 'multi.spec.ts');
    writeFileSync(file, `
import { test, expect } from "@playwright/test";
test("multi", async ({ page }) => {
  await page.waitForTimeout(1000);
  expect(await page.locator('.x').isVisible()).toBe(true);
});`);
    const project = makeProject();
    project.addSourceFileAtPath(file);
    const runner = new RuleRunner([r01NoHardWait, r05WebFirstAssertion], DEFAULT_CONFIG);
    const { findings } = runner.run([file], project);
    const ruleIds = findings.map(f => f.ruleId);
    expect(ruleIds).toContain('no-hard-wait');
    expect(ruleIds).toContain('web-first-assertion');
  });

  it('runs rules on multiple files', () => {
    const file1 = join(tmpDir, 'a.spec.ts');
    const file2 = join(tmpDir, 'b.spec.ts');
    writeFileSync(file1, 'import { test } from "@playwright/test";\ntest("a", async ({ page }) => { await page.waitForTimeout(1000); });');
    writeFileSync(file2, 'import { test } from "@playwright/test";\ntest("b", async ({ page }) => { await page.waitForTimeout(2000); });');
    const project = makeProject();
    project.addSourceFileAtPath(file1);
    project.addSourceFileAtPath(file2);
    const runner = new RuleRunner([r01NoHardWait], DEFAULT_CONFIG);
    const { findings } = runner.run([file1, file2], project);
    const files = [...new Set(findings.map(f => f.filePath))];
    expect(files).toHaveLength(2);
  });

  it('respects rule severity "off" in config', () => {
    const file = join(tmpDir, 'off.spec.ts');
    writeFileSync(file, 'import { test } from "@playwright/test";\ntest("off", async ({ page }) => { await page.waitForTimeout(1000); });');
    const project = makeProject();
    project.addSourceFileAtPath(file);
    const config = {
      ...DEFAULT_CONFIG,
      rules: { ...DEFAULT_CONFIG.rules, 'no-hard-wait': 'off' as const },
    };
    const runner = new RuleRunner([r01NoHardWait], config);
    const { findings } = runner.run([file], project);
    expect(findings).toHaveLength(0);
  });

  it('produces diffs in dry-run mode', () => {
    const file = join(tmpDir, 'fix.spec.ts');
    writeFileSync(file, 'import { test } from "@playwright/test";\ntest("fix", async ({ page }) => { await page.waitForTimeout(1000); });');
    const project = makeProject();
    project.addSourceFileAtPath(file);
    const runner = new RuleRunner([r01NoHardWait], DEFAULT_CONFIG, 'dry-run');
    const { diffs } = runner.run([file], project);
    expect(diffs.length).toBeGreaterThan(0);
    expect(diffs[0]).toContain('---');
    expect(diffs[0]).toContain('+++');
  });

  it('gracefully handles unparseable files', () => {
    const project = makeProject();
    const runner = new RuleRunner([r01NoHardWait], DEFAULT_CONFIG);
    const { findings } = runner.run([join(tmpDir, 'nonexistent.spec.ts')], project);
    expect(findings).toEqual([]);
  });

  it('catches and logs rule check() errors without crashing', () => {
    const file = join(tmpDir, 'crash.spec.ts');
    writeFileSync(file, 'const x = 1;');
    const project = makeProject();
    project.addSourceFileAtPath(file);
    const brokenRule: RuleDefinition = {
      apiVersion: 1,
      id: 'broken-rule',
      description: 'Always throws',
      defaultSeverity: 'error',
      fixable: false,
      check: () => { throw new Error('rule crashed'); },
    };
    const runner = new RuleRunner([brokenRule], DEFAULT_CONFIG);
    const { findings } = runner.run([file], project);
    expect(findings).toEqual([]);
  });
});
