import type { Severity } from './finding.js';

export type RuleOptions = Record<string, unknown>;
export type RuleEntry = Severity | 'off' | [Severity, RuleOptions];

export interface OverrideEntry {
  files: string[];
  rules: Record<string, Severity | 'off'>;
}

export interface ResolvedConfig {
  include: string[];
  exclude: string[];
  rules: Record<string, RuleEntry>;
  pageObjectPattern: string;
  specPattern: string;
  categoryFilter: string[];
  failOn: 'error' | 'warn';
  maxWarnings?: number;
  overrides?: OverrideEntry[];
}

export const DEFAULT_CONFIG: ResolvedConfig = {
  include: ['**/*.spec.ts', '**/*.spec.js', '**/*.test.ts', '**/*.test.js'],
  exclude: ['node_modules'],
  categoryFilter: [],
  failOn: 'error',
  rules: {
    'no-hard-wait': 'error',
    'deep-locator': ['warn', { maxDepth: 3 }],
    'unawaited-action': 'error',
    'web-first-assertion': 'error',
    'leaky-page-object': 'warn',
    'zombie-locator': 'warn',
    'no-page-pause': 'error',
    'no-focused-test': 'error',
    'no-hardcoded-base-url': 'warn',
    'no-hardcoded-timeout': 'warn',
    'no-console-in-test': 'warn',
    'no-skipped-test': 'warn',
    'no-assertion-in-page-object': 'warn',
    'no-test-without-assertion': 'warn',
  },
  pageObjectPattern: 'pages/**/*.ts',
  specPattern: '**/*.spec.ts',
};

