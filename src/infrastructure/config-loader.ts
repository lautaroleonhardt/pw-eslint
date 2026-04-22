import { dirname, join } from 'node:path';
import { DEFAULT_CONFIG, type ResolvedConfig, type RuleEntry, type OverrideEntry } from '../domain/config.js';
import { defaultFS, type FileSystem } from './fs.js';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const VALID_TOP_LEVEL_KEYS = new Set([
  'include',
  'exclude',
  'rules',
  'pageObjectPattern',
  'specPattern',
  'categoryFilter',
  'failOn',
  'maxWarnings',
  'overrides',
]);

const VALID_SEVERITIES = new Set(['error', 'warn', 'off']);

function validateGlobPattern(pattern: string, fieldName: string): void {
  if (pattern.length > 1024) {
    throw new ConfigValidationError(
      `"${fieldName}" glob pattern exceeds maximum length of 1024 characters.`,
    );
  }

  // Check brace nesting depth (max 3) and brace balance
  let depth = 0;
  let maxDepth = 0;
  for (const ch of pattern) {
    if (ch === '{') { maxDepth = Math.max(maxDepth, ++depth); }
    else if (ch === '}') {
      depth--;
      if (depth < 0) {
        throw new ConfigValidationError(
          `"${fieldName}" glob pattern has an unmatched closing brace '}'.`,
        );
      }
    }
  }
  if (depth !== 0) {
    throw new ConfigValidationError(
      `"${fieldName}" glob pattern has ${depth} unclosed brace(s) '{'.`,
    );
  }
  if (maxDepth > 3) {
    throw new ConfigValidationError(
      `"${fieldName}" glob pattern has brace nesting depth ${maxDepth} (max 3). Deeply nested braces cause exponential expansion.`,
    );
  }

  // Check max alternatives per brace expression (max 20)
  const stack: Array<{ commaCount: number; depth: number }> = [];
  let currentDepth = 0;
  for (const ch of pattern) {
    if (ch === '{') {
      currentDepth++;
      stack.push({ commaCount: 0, depth: currentDepth });
    } else if (ch === '}') {
      const group = stack.pop();
      if (group) {
        const alternatives = group.commaCount + 1;
        if (alternatives > 20) {
          throw new ConfigValidationError(
            `"${fieldName}" glob pattern has a brace expression with ${alternatives} alternatives (max 20).`,
          );
        }
      }
      currentDepth--;
    } else if (ch === ',' && currentDepth > 0) {
      const top = stack[stack.length - 1];
      if (top && top.depth === currentDepth) {
        top.commaCount++;
      }
    }
  }

  // Check for unclosed bracket (respects escape sequences)
  let inBracket = false;
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') { i++; continue; }
    if (ch === '[' && !inBracket) { inBracket = true; }
    else if (ch === ']' && inBracket) { inBracket = false; }
  }
  if (inBracket) {
    throw new ConfigValidationError(
      `"${fieldName}" glob pattern has an unclosed bracket '['.`,
    );
  }
}

function validateConfig(raw: Record<string, unknown>): void {
  for (const key of Object.keys(raw)) {
    if (!VALID_TOP_LEVEL_KEYS.has(key)) {
      throw new ConfigValidationError(
        `Unknown config key: "${key}". Valid keys are: ${[...VALID_TOP_LEVEL_KEYS].join(', ')}.`,
      );
    }
  }

  if (raw['include'] !== undefined) {
    if (
      !Array.isArray(raw['include']) ||
      !(raw['include'] as unknown[]).every((v) => typeof v === 'string')
    ) {
      throw new ConfigValidationError('"include" must be an array of strings.');
    }
  }

  if (raw['exclude'] !== undefined) {
    if (
      !Array.isArray(raw['exclude']) ||
      !(raw['exclude'] as unknown[]).every((v) => typeof v === 'string')
    ) {
      throw new ConfigValidationError('"exclude" must be an array of strings.');
    }
  }

  if (raw['pageObjectPattern'] !== undefined && typeof raw['pageObjectPattern'] !== 'string') {
    throw new ConfigValidationError('"pageObjectPattern" must be a string.');
  }
  if (typeof raw['pageObjectPattern'] === 'string') {
    validateGlobPattern(raw['pageObjectPattern'], 'pageObjectPattern');
  }

  if (raw['specPattern'] !== undefined && typeof raw['specPattern'] !== 'string') {
    throw new ConfigValidationError('"specPattern" must be a string.');
  }
  if (typeof raw['specPattern'] === 'string') {
    validateGlobPattern(raw['specPattern'], 'specPattern');
  }

  if (raw['categoryFilter'] !== undefined) {
    if (
      !Array.isArray(raw['categoryFilter']) ||
      !(raw['categoryFilter'] as unknown[]).every((v) => typeof v === 'string')
    ) {
      throw new ConfigValidationError('"categoryFilter" must be an array of strings.');
    }
  }

  if (raw['failOn'] !== undefined) {
    if (raw['failOn'] !== 'error' && raw['failOn'] !== 'warn') {
      throw new ConfigValidationError(
        `Invalid "failOn" value: "${raw['failOn']}". Must be "error" or "warn".`,
      );
    }
  }

  if (raw['maxWarnings'] !== undefined) {
    const n = raw['maxWarnings'];
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) {
      throw new ConfigValidationError(
        '"maxWarnings" must be a non-negative integer.',
      );
    }
  }

  if (raw['overrides'] !== undefined) {
    if (!Array.isArray(raw['overrides'])) {
      throw new ConfigValidationError('"overrides" must be an array.');
    }
    for (let i = 0; i < (raw['overrides'] as unknown[]).length; i++) {
      const entry = (raw['overrides'] as unknown[])[i];
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        throw new ConfigValidationError(`"overrides[${i}]" must be an object.`);
      }
      const obj = entry as Record<string, unknown>;
      if (!Array.isArray(obj['files']) || !(obj['files'] as unknown[]).every((v) => typeof v === 'string')) {
        throw new ConfigValidationError(`"overrides[${i}].files" must be an array of strings.`);
      }
      if (typeof obj['rules'] !== 'object' || obj['rules'] === null || Array.isArray(obj['rules'])) {
        throw new ConfigValidationError(`"overrides[${i}].rules" must be an object.`);
      }
      const overrideRules = obj['rules'] as Record<string, unknown>;
      for (const [ruleId, sev] of Object.entries(overrideRules)) {
        if (!VALID_SEVERITIES.has(sev as string)) {
          throw new ConfigValidationError(
            `Invalid severity for override rule "${ruleId}" in overrides[${i}]: "${sev}". Must be "error", "warn", or "off".`,
          );
        }
      }
    }
  }

  if (raw['rules'] !== undefined) {
    if (typeof raw['rules'] !== 'object' || Array.isArray(raw['rules']) || raw['rules'] === null) {
      throw new ConfigValidationError('"rules" must be an object.');
    }
    const rules = raw['rules'] as Record<string, unknown>;
    for (const [ruleId, entry] of Object.entries(rules)) {
      if (typeof entry === 'string') {
        if (!VALID_SEVERITIES.has(entry)) {
          throw new ConfigValidationError(
            `Invalid severity for rule "${ruleId}": "${entry}". Must be "error", "warn", or "off".`,
          );
        }
      } else if (Array.isArray(entry)) {
        if (entry.length < 1 || !VALID_SEVERITIES.has(entry[0] as string)) {
          throw new ConfigValidationError(
            `Invalid severity tuple for rule "${ruleId}": first element must be "error", "warn", or "off".`,
          );
        }
        if (entry.length > 1 && (typeof entry[1] !== 'object' || entry[1] === null || Array.isArray(entry[1]))) {
          throw new ConfigValidationError(
            `Invalid options for rule "${ruleId}": second element of tuple must be an object.`,
          );
        }
      } else {
        throw new ConfigValidationError(
          `Invalid entry for rule "${ruleId}": must be a severity string or [severity, options] tuple.`,
        );
      }
    }
  }
}

function findConfigFile(startDir: string, fs: FileSystem): string | undefined {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, '.pw-eslintrc.json');
    if (fs.exists(candidate)) return candidate;

    // Stop if we find a package.json (project root boundary)
    const pkgJson = join(dir, 'package.json');
    if (fs.exists(pkgJson)) return undefined;

    const parent = dirname(dir);
    if (parent === dir) return undefined; // filesystem root
    dir = parent;
  }
}

function stripJsoncComments(text: string): string {
  // State-machine parser: skips content inside JSON strings so URL // and glob /**/ are safe
  let result = '';
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i]!;

    // JSON string — copy verbatim until closing unescaped quote
    if (ch === '"') {
      result += ch;
      i++;
      while (i < len) {
        const sc = text[i]!;
        result += sc;
        if (sc === '\\') {
          i++;
          if (i < len) { result += text[i]!; i++; }
          continue;
        }
        if (sc === '"') { i++; break; }
        i++;
      }
      continue;
    }

    // Single-line comment: // ... \n
    if (ch === '/' && text[i + 1] === '/') {
      while (i < len && text[i] !== '\n') i++;
      continue;
    }

    // Block comment: /* ... */
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < len && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2; // skip closing */
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

export function loadConfig(cwd: string, explicitPath?: string, fs: FileSystem = defaultFS): ResolvedConfig {
  const configPath = explicitPath ?? findConfigFile(cwd, fs);
  if (!configPath) return DEFAULT_CONFIG;

  let raw: Record<string, unknown>;
  try {
    const text = fs.readFile(configPath);
    raw = JSON.parse(stripJsoncComments(text)) as Record<string, unknown>;
  } catch (err) {
    throw new ConfigValidationError(
      `Failed to parse config file at "${configPath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  validateConfig(raw);

  // Deep merge: DEFAULT_CONFIG as base, file values override
  const mergedRules: Record<string, RuleEntry> = {
    ...DEFAULT_CONFIG.rules,
    ...(raw['rules'] as Record<string, RuleEntry> | undefined),
  };

  // Parse overrides: validate glob patterns and warn/skip invalid ones
  const rawOverrides = raw['overrides'] as Array<{ files: string[]; rules: Record<string, string> }> | undefined;
  let overrides: OverrideEntry[] | undefined;
  if (rawOverrides) {
    overrides = [];
    for (let i = 0; i < rawOverrides.length; i++) {
      const entry = rawOverrides[i]!;
      const validFiles: string[] = [];
      for (const pattern of entry.files) {
        try {
          validateGlobPattern(pattern, `overrides[${i}].files`);
          validFiles.push(pattern);
        } catch (err) {
          if (err instanceof ConfigValidationError) throw err;
          process.stderr.write(`[pw-eslint] Invalid glob pattern in overrides, skipping: "${pattern}"\n`);
        }
      }
      if (validFiles.length > 0) {
        overrides.push({ files: validFiles, rules: entry.rules as OverrideEntry['rules'] });
      }
    }
  }

  return {
    include: (raw['include'] as string[] | undefined) ?? DEFAULT_CONFIG.include,
    exclude: (raw['exclude'] as string[] | undefined) ?? DEFAULT_CONFIG.exclude,
    rules: mergedRules,
    pageObjectPattern: (raw['pageObjectPattern'] as string | undefined) ?? DEFAULT_CONFIG.pageObjectPattern,
    specPattern: (raw['specPattern'] as string | undefined) ?? DEFAULT_CONFIG.specPattern,
    categoryFilter: (raw['categoryFilter'] as string[] | undefined) ?? DEFAULT_CONFIG.categoryFilter,
    failOn: (raw['failOn'] as 'error' | 'warn' | undefined) ?? DEFAULT_CONFIG.failOn,
    maxWarnings: (raw['maxWarnings'] as number | undefined),
    overrides,
  };
}
