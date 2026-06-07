# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`pw-eslint` is an AST-based static-analysis CLI that lints Playwright test files and
Page Object Models for flakiness/correctness/hygiene/style anti-patterns. ESM-only,
Node >=22. AST analysis is done with `ts-morph`; CLI parsing with `commander`.

## Commands

- `npm run build` — bundle with tsup → `dist/` (two entries: `cli/index` and `index`)
- `npm run dev` — tsup watch
- `npm test` — run all Vitest tests
- `npm run test:watch` — Vitest watch mode
- Single test file: `npx vitest run tests/unit/r01.test.ts`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint (flat config)
- `npm run format` / `npm run format:check` — Prettier
- `npm run bench` — `node bench/run.mjs`

Commits follow Conventional Commits (enforced by commitlint). Husky + lint-staged run
prettier + eslint --fix on staged `.ts` files.

## Architecture

The CLI is a pipeline orchestrated by `src/cli/run.ts`:

```
loadConfig → discoverFiles → loadCustomRules → filter rules (--rule/--category)
→ createProject (ts-morph) → RuleRunner.run → getFormatter().format → output → exit code
```

Layered structure under `src/`:
- `cli/` — entry (`index.ts`, Commander) + orchestration (`run.ts`), plus `explain.ts`, `init.ts`
- `domain/` — pure types: `rule.ts` (RuleDefinition/RuleContext/FixContext), `finding.ts`,
  `config.ts` (ResolvedConfig, DEFAULT_CONFIG), `diff.ts`
- `engine/` — `runner.ts` (executes rules + applies fixes), `file-discovery.ts`,
  `baseline-comparator.ts`, `project-factory.ts`
- `infrastructure/` — I/O: `config-loader.ts`, `plugin-loader.ts`, `fs.ts` (FS abstraction
  for testability), `baseline-loader.ts`, `staged-files.ts`
- `formatters/` — `index.ts` (Formatter interface + `getFormatter`), `pretty/json/junit/github`
- `rules/` — `index.ts` (`BUILT_IN_RULES`) + 14 rule files `r01-*.ts` … `r14-*.ts`

`src/index.ts` is the public library API (types, loaders, `RuleRunner`, `BUILT_IN_RULES`).
`src/cli/index.ts` is the bin entry (`pw-eslint` → `dist/cli/index.js`).

## Rule authoring

Each rule is a `RuleDefinition` (`src/domain/rule.ts`):
- `apiVersion: 1` (version guard — bump invalidates custom plugins), `id` (kebab-case),
  `defaultSeverity`, `fixable`, optional `category`, optional `explain`
- `check(context)` walks `context.sourceFile` (ts-morph) and calls `context.report(node, msg, suggestion?)`
- optional `fix(context)` receives `FixContext` (adds `findings[]`); **apply edits
  right-to-left** (sort findings by position descending) so earlier positions stay valid

Register built-ins in `src/rules/index.ts`. Custom rules load from `.pw-eslint/rules/*.js`
(default export, validated against `SUPPORTED_API_VERSION` by `plugin-loader.ts`).

The `RuleRunner` resolves effective severity per file (config `overrides` first match wins,
then global `rules`), honors `// pw-eslint-disable-next-line <ids>` comments, and tracks
fix position-conflicts to avoid double-applying overlapping fixes.

## Testing

Vitest 4. Tests in `tests/unit/**` and `tests/infrastructure/**`, named `*.test.ts`.
Convention: one `rNN.test.ts` per rule + `rNN-fix.test.ts` for fixable rules. Use the
helpers in `tests/helpers/fixture-runner.ts` (`runRuleOnFixture`, `runFixOnFixture`,
`runRulesOnFixtures`) with fixtures under `tests/fixtures/rNN/`. `globals: false` — import
`describe/it/expect` from `vitest`. Use `.js` extensions in relative imports (NodeNext ESM).

## Build notes

tsup config has an `onSuccess` step that injects the CLI shebang and restores the `node:`
prefix on built-in imports in the dist output (see commit 748ff50) — don't strip it.
TypeScript: `strict`, `noUncheckedIndexedAccess`, `module: NodeNext`.

## Config

`.pw-eslintrc.json` (JSONC), discovered by walking up to the nearest `package.json`.
`RuleEntry` = `'error' | 'warn' | 'off' | ['error'|'warn', options]`. Supports per-directory
`overrides`, `failOn`, `maxWarnings`, `pageObjectPattern`/`specPattern`. Defaults live in
`DEFAULT_CONFIG` (`src/domain/config.ts`).

Exit codes: 0 = clean, 1 = violations / maxWarnings exceeded / regressions (`--compare`),
2 = config or plugin error / usage error.
