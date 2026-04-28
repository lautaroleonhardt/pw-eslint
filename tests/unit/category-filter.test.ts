import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Project, ScriptTarget } from 'ts-morph';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';
import { BUILT_IN_RULES } from '../../src/rules/index.js';

function makeProject(): Project {
  return new Project({
    compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
    skipAddingFilesFromTsConfig: true,
  });
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pw-eslint-cat-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// Source that triggers violations in multiple categories
const MULTI_VIOLATION_SOURCE = `
await page.waitForTimeout(1000);
test.only('focused', async () => {});
await page.pause();
`;

function filterRulesByCategory(categories: string[]) {
  const catSet = new Set(categories);
  return BUILT_IN_RULES.filter((r) => catSet.has(r.category ?? 'uncategorized'));
}

function runWithRules(rules: ReturnType<typeof filterRulesByCategory>, source: string) {
  const filePath = join(tmpDir, 'test.spec.ts');
  writeFileSync(filePath, source, 'utf-8');
  const project = makeProject();
  project.addSourceFileAtPath(filePath);
  const runner = new RuleRunner(rules, DEFAULT_CONFIG, 'none');
  return runner.run([filePath], project).findings;
}

describe('category-based rule filtering', () => {
  it('RuleDefinition.category is set on all built-in rules', () => {
    for (const rule of BUILT_IN_RULES) {
      expect(rule.category).toBeDefined();
      expect(['flakiness', 'hygiene', 'style', 'correctness']).toContain(rule.category);
    }
  });

  it('flakiness category contains R01-R04', () => {
    const flakiness = BUILT_IN_RULES.filter((r) => r.category === 'flakiness');
    const ids = flakiness.map((r) => r.id);
    expect(ids).toContain('no-hard-wait');
    expect(ids).toContain('deep-locator');
    expect(ids).toContain('unawaited-action');
    expect(ids).toContain('zombie-locator');
  });

  it('correctness category contains R05', () => {
    const correctness = BUILT_IN_RULES.filter((r) => r.category === 'correctness');
    expect(correctness.map((r) => r.id)).toContain('web-first-assertion');
  });

  it('style category contains R08 and R12', () => {
    const style = BUILT_IN_RULES.filter((r) => r.category === 'style');
    const ids = style.map((r) => r.id);
    expect(ids).toContain('no-focused-test');
    expect(ids).toContain('no-skipped-test');
  });

  it('filtering by flakiness only runs flakiness rules', () => {
    const findings = runWithRules(filterRulesByCategory(['flakiness']), MULTI_VIOLATION_SOURCE);
    const ruleIds = new Set(findings.map((f) => f.ruleId));
    expect(ruleIds.has('no-hard-wait')).toBe(true);
    expect(ruleIds.has('no-focused-test')).toBe(false);
    expect(ruleIds.has('no-page-pause')).toBe(false);
  });

  it('filtering by style only runs style rules', () => {
    const findings = runWithRules(filterRulesByCategory(['style']), MULTI_VIOLATION_SOURCE);
    const ruleIds = new Set(findings.map((f) => f.ruleId));
    expect(ruleIds.has('no-focused-test')).toBe(true);
    expect(ruleIds.has('no-hard-wait')).toBe(false);
  });

  it('multiple categories combine as union', () => {
    const findings = runWithRules(
      filterRulesByCategory(['flakiness', 'hygiene']),
      MULTI_VIOLATION_SOURCE
    );
    const ruleIds = new Set(findings.map((f) => f.ruleId));
    expect(ruleIds.has('no-hard-wait')).toBe(true); // flakiness
    expect(ruleIds.has('no-page-pause')).toBe(true); // hygiene
    expect(ruleIds.has('no-focused-test')).toBe(false); // style — excluded
  });
});
