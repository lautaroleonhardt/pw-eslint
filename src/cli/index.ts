#!/usr/bin/env node
import { Command } from 'commander';
import { runCli } from './run.js';
import { runInit } from './init.js';
import { runExplain } from './explain.js';
import { BUILT_IN_RULES } from '../rules/index.js';
import { loadCustomRules, PluginLoadError, PluginApiVersionError } from '../infrastructure/plugin-loader.js';
import type { RuleDefinition } from '../domain/rule.js';
import { resolve } from 'node:path';

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

const program = new Command('pw-eslint')
  .description('AST-based static analysis for Playwright test files')
  .argument('[path]', 'File or directory to analyze (default: current directory)')
  .option('--config <path>', 'Path to config file (.pw-eslintrc.json)')
  .option('--format <format>', 'Output format: pretty|json|junit', 'pretty')
  .option('--fix', 'Auto-fix supported violations')
  .option('--dry-run', 'Preview fixes as unified diff, no file writes')
  .option('--rule <name>', 'Run only this rule (repeatable)', collect, [] as string[])
  .option('--category <name>', 'Run only rules in this category (repeatable)', collect, [] as string[])
  .option('--severity <level>', 'Minimum severity to report: error|warn')
  .option('--quiet', 'Suppress warnings, show only errors')
  .option('--no-color', 'Disable colored output')
  .option('--staged', 'Analyze only git-staged files')
  .option('--output-file <path>', 'Write report to file instead of stdout')
  .option('--max-warnings <n>', 'Fail if warning count exceeds threshold', parseInt)
  .option('--compare <path>', 'Compare findings against a baseline JSON file')
  .option('--init', 'Generate a .pw-eslintrc.json config file in the current directory')
  .option('--init-config <path>', 'Path for generated config file (used with --init)')
  .action(async (
    path: string | undefined,
    options: {
      config?: string;
      format: string;
      fix?: boolean;
      dryRun?: boolean;
      rule: string[];
      category: string[];
      severity?: string;
      quiet?: boolean;
      color: boolean;
      staged?: boolean;
      outputFile?: string;
      maxWarnings?: number;
      compare?: string;
      init?: boolean;
      initConfig?: string;
    },
  ) => {
    if (options.init) {
      runInit({ configPath: options.initConfig, cwd: process.cwd() });
      return;
    }

    await runCli({
      path: path ?? process.cwd(),
      config: options.config,
      format: options.format,
      fix: options.fix,
      dryRun: options.dryRun,
      rule: options.rule.length > 0 ? options.rule : undefined,
      category: options.category.length > 0 ? options.category : undefined,
      severity: options.severity as 'error' | 'warn' | undefined,
      quiet: options.quiet,
      color: options.color,
      staged: options.staged,
      outputFile: options.outputFile,
      maxWarnings: options.maxWarnings,
      compare: options.compare,
    });
  });

// explain subcommand
program
  .command('explain [rule-id]')
  .description('Explain a rule or list all rules. Use --list to show all rules.')
  .option('--list', 'List all rules in a table')
  .option('--no-color', 'Disable colored output')
  .action(async (
    ruleId: string | undefined,
    options: { list?: boolean; color: boolean },
  ) => {
    const absTarget = resolve(process.cwd());
    let customRules: RuleDefinition[];
    try {
      customRules = await loadCustomRules(absTarget);
    } catch (err) {
      if (err instanceof PluginLoadError || err instanceof PluginApiVersionError) {
        process.stderr.write(`[pw-eslint] ${err.message}\n`);
        process.exit(2);
      }
      customRules = [];
    }
    const allRules = [...BUILT_IN_RULES, ...customRules];

    if (options.list || !ruleId) {
      runExplain('--list', allRules, { color: options.color });
    } else {
      runExplain(ruleId, allRules, { color: options.color });
    }
  });

// help alias (pw-eslint help → explain --list)
program
  .command('help', { hidden: true })
  .description('Alias for: explain --list')
  .option('--no-color', 'Disable colored output')
  .action(async (options: { color: boolean }) => {
    const absTarget = resolve(process.cwd());
    let customRules: RuleDefinition[];
    try {
      customRules = await loadCustomRules(absTarget);
    } catch {
      customRules = [];
    }
    const allRules = [...BUILT_IN_RULES, ...customRules];
    runExplain('--list', allRules, { color: options.color });
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`[pw-eslint] Fatal error: ${err}\n`);
  process.exit(2);
});
