import { join, resolve } from 'node:path';
import { glob } from 'tinyglobby';
import type { RuleDefinition } from '../domain/rule.js';
import { defaultFS, type FileSystem } from './fs.js';

export const SUPPORTED_API_VERSION = 1;

export class PluginLoadError extends Error {
  constructor(
    public readonly rulePath: string,
    cause: unknown,
  ) {
    super(
      `Failed to load rule file "${rulePath}": ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    this.name = 'PluginLoadError';
  }
}

export class PluginApiVersionError extends Error {
  constructor(
    public readonly ruleId: string,
    public readonly found: number,
    public readonly expected: number,
  ) {
    super(
      `Custom rule "${ruleId}" declares apiVersion ${found}, but this CLI only supports apiVersion ${expected}.`,
    );
    this.name = 'PluginApiVersionError';
  }
}

function isValidRuleDefinition(value: unknown): value is RuleDefinition {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['description'] === 'string' &&
    (obj['defaultSeverity'] === 'error' || obj['defaultSeverity'] === 'warn') &&
    typeof obj['fixable'] === 'boolean' &&
    typeof obj['check'] === 'function'
  );
}

export async function loadCustomRules(
  projectRoot: string,
  fs: FileSystem = defaultFS
): Promise<RuleDefinition[]> {
  const rulesDir = join(projectRoot, '.pw-eslint', 'rules');

  if (!fs.exists(rulesDir)) {
    return [];
  }

  const pattern = join(rulesDir, '*.js').replace(/\\/g, '/');
  const files = await glob(pattern, { absolute: true });

  const rules: RuleDefinition[] = [];

  for (const filePath of files.sort()) {
    let mod: { default?: unknown };
    try {
      mod = await import(resolve(filePath)) as { default?: unknown };
    } catch (err) {
      throw new PluginLoadError(filePath, err);
    }

    const exported = mod.default;

    if (!exported || typeof exported !== 'object') {
      throw new PluginLoadError(filePath, 'No default export found. Custom rules must export a RuleDefinition object as the default export.');
    }

    const obj = exported as Record<string, unknown>;

    // Check apiVersion before full validation
    if (obj['apiVersion'] !== SUPPORTED_API_VERSION) {
      if (typeof obj['id'] === 'string') {
        throw new PluginApiVersionError(
          obj['id'],
          obj['apiVersion'] as number,
          SUPPORTED_API_VERSION,
        );
      }
      throw new PluginLoadError(
        filePath,
        `Custom rule declares apiVersion ${obj['apiVersion']}, but this CLI only supports apiVersion ${SUPPORTED_API_VERSION}. Rule is missing a valid "id" field.`,
      );
    }

    if (!isValidRuleDefinition(exported)) {
      throw new PluginLoadError(
        filePath,
        'Default export is not a valid RuleDefinition. Required fields: id (string), description (string), defaultSeverity ("error"|"warn"), fixable (boolean), check (function).',
      );
    }

    rules.push(exported);
  }

  return rules;
}
