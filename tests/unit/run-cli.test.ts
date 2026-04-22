import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ResolvedConfig } from '../../src/domain/config.js';
import type { Finding } from '../../src/domain/finding.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockLoadConfig = vi.fn<(...args: unknown[]) => ResolvedConfig>();
const mockDiscoverFiles = vi.fn<(...args: unknown[]) => Promise<string[]>>();
const mockLoadCustomRules = vi.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockGetStagedFiles = vi.fn<(...args: unknown[]) => string[]>();
const mockLoadBaseline = vi.fn();
const mockCompareFindings = vi.fn();
const mockCreateProject = vi.fn();
const mockRunnerRun = vi.fn<(...args: unknown[]) => { findings: Finding[]; diffs: string[] }>();

vi.mock('../../src/infrastructure/config-loader.js', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    loadConfig: (...args: unknown[]) => mockLoadConfig(...args),
  };
});

vi.mock('../../src/engine/file-discovery.js', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    discoverFiles: (...args: unknown[]) => mockDiscoverFiles(...args),
  };
});

vi.mock('../../src/infrastructure/plugin-loader.js', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    loadCustomRules: (...args: unknown[]) => mockLoadCustomRules(...args),
  };
});

vi.mock('../../src/infrastructure/staged-files.js', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    getStagedFiles: (...args: unknown[]) => mockGetStagedFiles(...args),
  };
});

vi.mock('../../src/infrastructure/baseline-loader.js', async (importOriginal) => {
  const orig = await importOriginal() as Record<string, unknown>;
  return {
    ...orig,
    loadBaseline: (...args: unknown[]) => mockLoadBaseline(...args),
  };
});

vi.mock('../../src/engine/baseline-comparator.js', () => ({
  compareFindings: (...args: unknown[]) => mockCompareFindings(...args),
}));

vi.mock('../../src/engine/project-factory.js', () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

vi.mock('../../src/engine/runner.js', () => ({
  RuleRunner: class {
    run(...args: unknown[]) { return mockRunnerRun(...args); }
  },
}));

vi.mock('../../src/rules/index.js', () => ({
  BUILT_IN_RULES: [
    { id: 'no-hard-wait', description: 'test', defaultSeverity: 'error', fixable: false, category: 'flakiness', check: () => [] },
    { id: 'deep-locator', description: 'test', defaultSeverity: 'warn', fixable: false, category: 'hygiene', check: () => [] },
  ],
}));

vi.mock('../../src/formatters/index.js', () => ({
  getFormatter: () => ({
    format: (findings: Finding[]) => findings.length > 0 ? `Found ${findings.length} issue(s)` : 'No issues',
  }),
}));

// ── ExitError (thrown by mocked process.exit to halt execution) ────────────

class ExitError extends Error {
  constructor(public code?: number) { super(`process.exit(${code})`); }
}

// ── Helpers ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ResolvedConfig = {
  include: ['**/*.spec.ts'],
  exclude: ['node_modules'],
  rules: { 'no-hard-wait': 'error' },
  pageObjectPattern: 'pages/**/*.ts',
  specPattern: '**/*.spec.ts',
  categoryFilter: [],
  failOn: 'error',
};

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: 'no-hard-wait',
    severity: 'error',
    filePath: '/fake/test.spec.ts',
    line: 1,
    column: 1,
    message: 'Avoid page.waitForTimeout()',
    fixable: false,
    ...overrides,
  };
}

function setupDefaults() {
  mockLoadConfig.mockReturnValue(DEFAULT_CONFIG);
  mockDiscoverFiles.mockResolvedValue(['/fake/test.spec.ts']);
  mockLoadCustomRules.mockResolvedValue([]);
  mockCreateProject.mockReturnValue({});
  mockRunnerRun.mockReturnValue({ findings: [], diffs: [] });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('runCli', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let tmpDir: string;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new ExitError(code); }) as never);
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    tmpDir = mkdtempSync(join(tmpdir(), 'pw-eslint-cli-'));
    setupDefaults();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  async function run(overrides: Partial<import('../../src/cli/run.js').CliOptions> = {}) {
    const { runCli } = await import('../../src/cli/run.js');
    try {
      await runCli({ path: tmpDir, ...overrides });
    } catch (err) {
      if (err instanceof ExitError) return;
      throw err;
    }
  }

  it('exits 0 when no violations', async () => {
    await run();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits 1 when error-severity violations found', async () => {
    mockRunnerRun.mockReturnValue({ findings: [makeFinding()], diffs: [] });
    await run();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits 2 when path does not exist (FileNotFoundError)', async () => {
    const { FileNotFoundError } = await import('../../src/engine/file-discovery.js');
    mockDiscoverFiles.mockRejectedValue(new FileNotFoundError('/nonexistent'));
    await run();
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('exits 0 when no files match (with stderr message)', async () => {
    mockDiscoverFiles.mockResolvedValue([]);
    await run();
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No files matched'),
    );
  });

  it('exits 2 when --fix and --dry-run together', async () => {
    await run({ fix: true, dryRun: true });
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('--fix and --dry-run cannot be used together'),
    );
  });

  it('exits 2 for invalid config', async () => {
    const { ConfigValidationError } = await import('../../src/infrastructure/config-loader.js');
    mockLoadConfig.mockImplementation(() => { throw new ConfigValidationError('bad config'); });
    await run();
    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Config error'),
    );
  });

  it('filters by --rule flag', async () => {
    const finding = makeFinding({ ruleId: 'no-hard-wait' });
    mockRunnerRun.mockReturnValue({ findings: [finding], diffs: [] });
    await run({ rule: ['no-hard-wait'] });
    // The runner was constructed with filtered rules — we just verify it ran
    expect(exitSpy).toHaveBeenCalled();
  });

  it('writes output to file with --output-file', async () => {
    const outFile = join(tmpDir, 'output.txt');
    mockRunnerRun.mockReturnValue({ findings: [makeFinding()], diffs: [] });
    await run({ outputFile: outFile });
    const content = readFileSync(outFile, 'utf-8');
    expect(content).toContain('1 issue');
    expect(stdoutSpy).not.toHaveBeenCalledWith(expect.stringContaining('issue'));
  });

  it('exits 1 when --max-warnings exceeded', async () => {
    mockRunnerRun.mockReturnValue({
      findings: [
        makeFinding({ severity: 'warn', ruleId: 'deep-locator' }),
        makeFinding({ severity: 'warn', ruleId: 'deep-locator' }),
      ],
      diffs: [],
    });
    await run({ maxWarnings: 1 });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('exits 1 for invalid --category', async () => {
    await run({ category: ['nonexistent-category'] });
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Category not found'),
    );
  });

  it('exits 0 for --dry-run with no diffs', async () => {
    mockRunnerRun.mockReturnValue({ findings: [], diffs: [] });
    await run({ dryRun: true });
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stdoutSpy).toHaveBeenCalledWith(
      expect.stringContaining('No fixes to apply'),
    );
  });

  it('exits 0 for --dry-run with diffs', async () => {
    mockRunnerRun.mockReturnValue({ findings: [], diffs: ['--- a\n+++ b'] });
    await run({ dryRun: true });
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining('--- a'));
  });

  it('exits 2 when plugin load fails', async () => {
    const { PluginLoadError } = await import('../../src/infrastructure/plugin-loader.js');
    mockLoadCustomRules.mockRejectedValue(new PluginLoadError('/bad/plugin.js', 'syntax error'));
    await run();
    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('exits 0 when only warnings and failOn is error', async () => {
    mockRunnerRun.mockReturnValue({
      findings: [makeFinding({ severity: 'warn' })],
      diffs: [],
    });
    await run();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
