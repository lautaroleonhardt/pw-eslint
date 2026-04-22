import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Project, ScriptTarget } from 'ts-morph';
import { RuleRunner } from '../../src/engine/runner.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';
import { r01NoHardWait } from '../../src/rules/r01-no-hard-wait.js';
import { r05WebFirstAssertion } from '../../src/rules/r05-web-first-assertion.js';

function makeProject(): Project {
  return new Project({
    compilerOptions: { target: ScriptTarget.ES2022, allowJs: true, strict: false },
    skipAddingFilesFromTsConfig: true,
  });
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pw-eslint-disable-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function runInline(source: string) {
  const filePath = join(tmpDir, 'test.spec.ts');
  writeFileSync(filePath, source, 'utf-8');

  const project = makeProject();
  project.addSourceFileAtPath(filePath);

  const runner = new RuleRunner([r01NoHardWait, r05WebFirstAssertion], DEFAULT_CONFIG, 'none');
  return runner.run([filePath], project).findings;
}

describe('inline disable comments', () => {
  it('suppresses violation on next line for single rule', () => {
    const source = `// pw-eslint-disable-next-line no-hard-wait
await page.waitForTimeout(1000);
`;
    const findings = runInline(source);
    expect(findings).toHaveLength(0);
  });

  it('does NOT suppress violation on other lines', () => {
    const source = `// pw-eslint-disable-next-line no-hard-wait
await page.waitForTimeout(1000);
await page.waitForTimeout(2000);
`;
    const findings = runInline(source);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('no-hard-wait');
  });

  it('suppresses multiple rules in one comment', () => {
    const source = `// pw-eslint-disable-next-line no-hard-wait, web-first-assertion
await page.waitForTimeout(500);
`;
    const findings = runInline(source);
    expect(findings).toHaveLength(0);
  });

  it('is case-insensitive for rule ID', () => {
    const source = `// pw-eslint-disable-next-line NO-HARD-WAIT
await page.waitForTimeout(1000);
`;
    const findings = runInline(source);
    expect(findings).toHaveLength(0);
  });

  it('disable on last line of file is a no-op (no violation on non-existent next line)', () => {
    const source = `await page.waitForTimeout(100);
// pw-eslint-disable-next-line no-hard-wait`;
    const findings = runInline(source);
    // The waitForTimeout violation fires; the disable comment on last line has nothing to suppress
    expect(findings).toHaveLength(1);
  });

  it('does not suppress a different rule', () => {
    const source = `// pw-eslint-disable-next-line web-first-assertion
await page.waitForTimeout(1000);
`;
    const findings = runInline(source);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.ruleId).toBe('no-hard-wait');
  });

  it('multiple consecutive disables each apply to their own next line', () => {
    const source = `// pw-eslint-disable-next-line no-hard-wait
await page.waitForTimeout(1000);
// pw-eslint-disable-next-line no-hard-wait
await page.waitForTimeout(2000);
`;
    const findings = runInline(source);
    expect(findings).toHaveLength(0);
  });
});
