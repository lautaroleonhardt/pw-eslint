/**
 * Performance benchmark: analyze 500 synthetic Playwright spec files.
 * Gate: median of 3 runs must complete in under 10 seconds.
 *
 * Run: npm run bench  (NOT part of npm test)
 * Requires: npm run build must be run first.
 */
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';

const GATE_MS = 10_000;
const FILE_COUNT = 500;
const RUNS = 3;

// Synthetic spec file template — exercises multiple rules per file
function makeSpecContent(index) {
  return `import { test, expect } from '@playwright/test';

test('scenario ${index}', async ({ page }) => {
  await page.goto('https://example.com/${index}');
  await page.waitForTimeout(1000);

  const btn = page.locator('.container').locator('.row').locator('.col').locator('button');
  btn.click();

  const el = page.locator('#heading-${index}');
  await page.waitForSelector('.loaded');
  expect(await el.isVisible()).toBe(true);
});
`;
}

async function runBench() {
  // Dynamic import — requires dist/ to exist
  let RuleRunner, BUILT_IN_RULES, DEFAULT_CONFIG, Project;
  try {
    ({ RuleRunner, BUILT_IN_RULES, DEFAULT_CONFIG } = await import('../dist/index.js'));
    ({ Project } = await import('ts-morph'));
  } catch (err) {
    console.error('[bench] Failed to import compiled output. Run "npm run build" first.');
    console.error(err.message);
    process.exit(2);
  }

  // Generate fixture files in a temp directory
  const root = mkdtempSync(join(tmpdir(), 'pw-eslint-bench-'));
  const specDir = join(root, 'tests');
  mkdirSync(specDir, { recursive: true });

  console.log(`[bench] Generating ${FILE_COUNT} synthetic spec files in ${specDir}...`);
  const filePaths = [];
  for (let i = 0; i < FILE_COUNT; i++) {
    const filePath = join(specDir, `spec-${String(i).padStart(4, '0')}.spec.ts`);
    writeFileSync(filePath, makeSpecContent(i), 'utf-8');
    filePaths.push(filePath);
  }

  const config = {
    ...DEFAULT_CONFIG,
    include: ['tests/**/*.spec.ts'],
    exclude: [],
  };

  const durations = [];

  for (let run = 1; run <= RUNS; run++) {
    const project = new Project({ useInMemoryFileSystem: false, skipAddingFilesFromTsConfig: true });
    const runner = new RuleRunner(BUILT_IN_RULES, config, 'none');

    const start = performance.now();
    const { findings } = runner.run(filePaths, project);
    const elapsed = performance.now() - start;

    durations.push(elapsed);
    console.log(`[bench] Run ${run}/${RUNS}: ${elapsed.toFixed(0)}ms — ${findings.length} findings`);
  }

  // Cleanup
  rmSync(root, { recursive: true, force: true });

  durations.sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  console.log(`\n[bench] Median: ${median.toFixed(0)}ms  Gate: ${GATE_MS}ms`);

  if (median >= GATE_MS) {
    console.error(`[bench] FAIL — median ${median.toFixed(0)}ms exceeds ${GATE_MS}ms gate.`);
    process.exit(1);
  }

  console.log(`[bench] PASS — ${FILE_COUNT} files analyzed in ${median.toFixed(0)}ms (median).`);
}

runBench().catch((err) => {
  console.error('[bench] Unexpected error:', err);
  process.exit(2);
});
