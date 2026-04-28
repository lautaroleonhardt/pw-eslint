import { resolve, dirname } from 'node:path';
import { loadConfig, ConfigValidationError } from '../infrastructure/config-loader.js';
import { defaultFS } from '../infrastructure/fs.js';
import {
  loadCustomRules,
  PluginLoadError,
  PluginApiVersionError,
} from '../infrastructure/plugin-loader.js';
import { discoverFiles, FileNotFoundError } from '../engine/file-discovery.js';
import { getStagedFiles, NotAGitRepoError } from '../infrastructure/staged-files.js';
import { loadBaseline, BaselineLoadError } from '../infrastructure/baseline-loader.js';
import { compareFindings } from '../engine/baseline-comparator.js';
import { createProject } from '../engine/project-factory.js';
import { RuleRunner } from '../engine/runner.js';
import { BUILT_IN_RULES } from '../rules/index.js';
import { getFormatter } from '../formatters/index.js';
import type { Severity } from '../domain/finding.js';
import type { DiffReport } from '../domain/diff.js';

export interface CliOptions {
  path: string;
  format?: string;
  color?: boolean;
  config?: string;
  fix?: boolean;
  dryRun?: boolean;
  rule?: string[];
  category?: string[];
  severity?: 'error' | 'warn';
  quiet?: boolean;
  staged?: boolean;
  outputFile?: string;
  maxWarnings?: number;
  compare?: string;
}

export async function runCli(options: CliOptions): Promise<void> {
  const { path: targetPath, format = 'pretty', color = true } = options;
  const noColor = !color;
  const absTarget = resolve(targetPath);

  // --fix and --dry-run are mutually exclusive
  if (options.fix && options.dryRun) {
    process.stderr.write('[pw-eslint] --fix and --dry-run cannot be used together.\n');
    process.exit(2);
  }

  let config;
  try {
    config = loadConfig(absTarget, options.config);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      process.stderr.write(`[pw-eslint] Config error: ${err.message}\n`);
      process.exit(2);
    }
    throw err;
  }

  let filePaths: string[];
  try {
    filePaths = await discoverFiles(absTarget, config);
  } catch (err) {
    if (err instanceof FileNotFoundError) {
      process.stderr.write(`[pw-eslint] ${err.message}\n`);
      process.exit(2);
    }
    throw err;
  }

  if (filePaths.length === 0) {
    process.stderr.write('[pw-eslint] No files matched the include patterns.\n');
    process.exit(0);
  }

  // --staged: filter to only git-staged files
  if (options.staged) {
    let stagedFiles: string[];
    try {
      stagedFiles = getStagedFiles(absTarget);
    } catch (err) {
      if (err instanceof NotAGitRepoError) {
        process.stderr.write(`[pw-eslint] Not in a git repository\n`);
        process.exit(2);
      }
      throw err;
    }

    const stagedSet = new Set(stagedFiles);
    filePaths = filePaths.filter((p) => stagedSet.has(p));

    if (filePaths.length === 0) {
      process.exit(0);
    }
  }

  // Load custom rules from .pw-eslint/rules/*.js
  let customRules;
  try {
    customRules = await loadCustomRules(absTarget);
  } catch (err) {
    if (err instanceof PluginLoadError) {
      process.stderr.write(`[pw-eslint] ${err.message}\n`);
      process.exit(2);
    }
    if (err instanceof PluginApiVersionError) {
      process.stderr.write(`[pw-eslint] ${err.message}\n`);
      process.exit(2);
    }
    throw err;
  }

  const allRules = [...BUILT_IN_RULES, ...customRules];

  // Validate --category values
  const VALID_CATEGORIES = new Set([
    'flakiness',
    'hygiene',
    'style',
    'correctness',
    'uncategorized',
  ]);
  const categoryFilter = options.category?.length
    ? options.category
    : config.categoryFilter.length
      ? config.categoryFilter
      : [];

  for (const cat of categoryFilter) {
    if (!VALID_CATEGORIES.has(cat)) {
      process.stderr.write(
        `[pw-eslint] Category not found: "${cat}". Valid categories: ${[...VALID_CATEGORIES].join(', ')}\n`
      );
      process.exit(1);
    }
  }

  // Filter rules by --rule and/or --category (union when both are specified)
  const hasRuleFilter = options.rule && options.rule.length > 0;
  const hasCategoryFilter = categoryFilter.length > 0;
  const categorySet = new Set(categoryFilter);

  const activeRules = allRules.filter((r) => {
    const matchesRule = hasRuleFilter ? options.rule!.includes(r.id) : false;
    const matchesCategory = hasCategoryFilter
      ? categorySet.has(r.category ?? 'uncategorized')
      : false;

    if (hasRuleFilter && hasCategoryFilter) return matchesRule || matchesCategory; // union
    if (hasRuleFilter) return matchesRule;
    if (hasCategoryFilter) return matchesCategory;
    return true; // no filter — run all
  });

  const fixMode = options.fix ? 'fix' : options.dryRun ? 'dry-run' : 'none';

  const project = createProject(absTarget);
  const runner = new RuleRunner(activeRules, config, fixMode);
  const { findings, diffs } = runner.run(filePaths, project);

  // --dry-run: print diffs and exit 0
  if (options.dryRun) {
    if (diffs.length > 0) {
      process.stdout.write(diffs.join('\n') + '\n');
    } else {
      process.stdout.write('[pw-eslint] No fixes to apply.\n');
    }
    process.exit(0);
  }

  // Resolve effective severity filter: --quiet wins over --severity
  const severityFilter: Severity | undefined = options.quiet ? 'error' : options.severity;

  const filteredFindings = severityFilter
    ? findings.filter((f) => f.severity === severityFilter)
    : findings;

  // --compare: load baseline and compute diff
  let diff: DiffReport | undefined;
  if (options.compare) {
    if (format === 'junit') {
      process.stderr.write(
        '[pw-eslint] --compare is not supported with --format junit. Diff metadata will be omitted.\n'
      );
    }
    let baseline;
    try {
      baseline = loadBaseline(resolve(options.compare));
    } catch (err) {
      if (err instanceof BaselineLoadError) {
        process.stderr.write(`[pw-eslint] ${err.message}\n`);
        process.exit(2);
      }
      throw err;
    }
    diff = compareFindings(baseline, filteredFindings);
  }

  const formatter = getFormatter(format as 'pretty' | 'json' | 'junit' | 'github');
  const output =
    formatter.format(
      filteredFindings,
      noColor,
      diff,
      activeRules.map((r) => r.id)
    ) + '\n';

  // --output-file: write to file; fall back to stdout
  if (options.outputFile) {
    const absOutputFile = resolve(options.outputFile);
    try {
      defaultFS.mkdir(dirname(absOutputFile), { recursive: true });
      defaultFS.writeFile(absOutputFile, output);
    } catch (err) {
      process.stderr.write(
        `[pw-eslint] Failed to write output file: ${err instanceof Error ? err.message : String(err)}\n`
      );
      process.exit(2);
    }
  } else {
    process.stdout.write(output);
  }

  // --max-warnings: CLI flag takes precedence over config (applies to current findings per AC-29)
  const maxWarnings = options.maxWarnings ?? config.maxWarnings;
  const warningCount = filteredFindings.filter((f) => f.severity === 'warn').length;
  const exceedsMaxWarnings = maxWarnings !== undefined && warningCount > maxWarnings;

  // Determine exit code
  if (diff) {
    // --compare mode: exit based on new violations only
    const failOn = config.failOn;
    const newViolationsExist =
      failOn === 'warn' ? diff.new.length > 0 : diff.new.some((f) => f.severity === 'error');
    if (newViolationsExist || exceedsMaxWarnings) {
      process.exit(1);
    }
    process.exit(0);
  }

  const errorCount = filteredFindings.filter((f) => f.severity === 'error').length;

  // failOn: 'warn' means any finding triggers exit 1
  const failOn = config.failOn;
  const hasFailOnViolation = failOn === 'warn' ? filteredFindings.length > 0 : errorCount > 0;

  if (hasFailOnViolation || exceedsMaxWarnings) {
    process.exit(1);
  }
  process.exit(0);
}
