import { describe, it, expect } from 'vitest';
import { mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { copyFileSync } from 'node:fs';
import {
  loadCustomRules,
  PluginLoadError,
  PluginApiVersionError,
} from '../../src/infrastructure/plugin-loader.js';

const FIXTURES = new URL('../fixtures/plugins', import.meta.url).pathname;

function makeProjectRoot(setup?: (rulesDir: string) => void): string {
  const root = mkdtempSync(join(tmpdir(), 'pw-eslint-test-'));
  if (setup) {
    const rulesDir = join(root, '.pw-eslint', 'rules');
    mkdirSync(rulesDir, { recursive: true });
    setup(rulesDir);
  }
  return root;
}

describe('loadCustomRules', () => {
  it('returns empty array when no .pw-eslint/rules directory exists', async () => {
    const root = makeProjectRoot(); // no setup → no .pw-eslint dir
    try {
      const rules = await loadCustomRules(root);
      expect(rules).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns empty array when .pw-eslint/rules directory is empty', async () => {
    const root = makeProjectRoot(() => {
      // setup creates the dir but adds no files
    });
    try {
      const rules = await loadCustomRules(root);
      expect(rules).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('loads a single valid rule', async () => {
    const root = makeProjectRoot((rulesDir) => {
      copyFileSync(join(FIXTURES, 'valid-rule.js'), join(rulesDir, 'valid-rule.js'));
    });
    try {
      const rules = await loadCustomRules(root);
      expect(rules).toHaveLength(1);
      expect(rules[0]!.id).toBe('custom-valid-rule');
      expect(rules[0]!.apiVersion).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('loads multiple valid rules', async () => {
    const root = makeProjectRoot((rulesDir) => {
      copyFileSync(join(FIXTURES, 'valid-rule.js'), join(rulesDir, 'valid-rule.js'));
      copyFileSync(join(FIXTURES, 'valid-rule-b.js'), join(rulesDir, 'valid-rule-b.js'));
    });
    try {
      const rules = await loadCustomRules(root);
      expect(rules).toHaveLength(2);
      const ids = rules.map((r) => r.id).sort();
      expect(ids).toEqual(['custom-valid-rule', 'custom-valid-rule-b']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws PluginApiVersionError for unsupported apiVersion', async () => {
    const root = makeProjectRoot((rulesDir) => {
      copyFileSync(join(FIXTURES, 'bad-api-version.js'), join(rulesDir, 'bad-api-version.js'));
    });
    try {
      await expect(loadCustomRules(root)).rejects.toThrow(PluginApiVersionError);
      await expect(loadCustomRules(root)).rejects.toMatchObject({
        ruleId: 'custom-bad-version-rule',
        found: 2,
        expected: 1,
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws PluginLoadError for a file with no default export', async () => {
    const root = makeProjectRoot((rulesDir) => {
      copyFileSync(join(FIXTURES, 'no-export.js'), join(rulesDir, 'no-export.js'));
    });
    try {
      await expect(loadCustomRules(root)).rejects.toThrow(PluginLoadError);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws PluginLoadError for a file with a syntax error', async () => {
    const root = makeProjectRoot((rulesDir) => {
      copyFileSync(join(FIXTURES, 'syntax-error.js'), join(rulesDir, 'syntax-error.js'));
    });
    try {
      await expect(loadCustomRules(root)).rejects.toThrow(PluginLoadError);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
