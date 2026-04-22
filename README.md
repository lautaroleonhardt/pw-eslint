# pw-eslint

> AST-based static analysis CLI for Playwright test files and Page Object Models.

[![npm version](https://img.shields.io/npm/v/@pw-eslint/cli)](https://www.npmjs.com/package/@pw-eslint/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Installation

```bash
npm install -g @pw-eslint/cli
```

---

## Usage

```bash
# Analyze the current directory
pw-eslint .

# Analyze a specific path
pw-eslint src/tests

# Auto-fix fixable violations
pw-eslint . --fix

# Preview fixes without writing
pw-eslint . --dry-run

# Output as JSON
pw-eslint . --format json

# Only show errors (suppress warnings)
pw-eslint . --quiet

# Filter by rule category
pw-eslint . --category flakiness

# Analyze only git-staged files
pw-eslint . --staged

# Generate a config file
pw-eslint --init

# Explain a rule
pw-eslint explain no-hard-wait

# List all rules
pw-eslint explain --list

# Compare against a baseline
pw-eslint . --format json > baseline.json
# ... make changes ...
pw-eslint . --compare baseline.json
```

---

## CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `[path]` | Path to analyze (file or directory) | `.` |
| `--format <fmt>` | Output format: `pretty`, `json`, `junit`, `github` | `pretty` |
| `--fix` | Apply auto-fixes in place | `false` |
| `--dry-run` | Preview fixes as a unified diff | `false` |
| `--rule <id...>` | Run only the specified rule(s) (repeatable) | all enabled rules |
| `--category <name...>` | Run only rules in the specified category(s) (repeatable) | all categories |
| `--severity <level>` | Filter output to `error` or `warn` | all |
| `--quiet` | Show only `error` findings (same as `--severity error`) | `false` |
| `--no-color` | Disable colored output | `false` |
| `--config <path>` | Path to a specific config file | auto-discovered |
| `--staged` | Analyze only git-staged files | `false` |
| `--output-file <path>` | Write report to a file instead of stdout | stdout |
| `--max-warnings <n>` | Exit 1 if warning count exceeds threshold | unlimited |
| `--compare <path>` | Compare against a baseline JSON for regression detection | disabled |
| `--init` | Generate `.pw-eslintrc.json` with all rules | — |
| `--init-config <path>` | Custom path for generated config file | `.pw-eslintrc.json` |

---

## Configuration

Create `.pw-eslintrc.json` at your project root (next to `package.json`):

```json
{
  "include": ["**/*.spec.ts"],
  "exclude": ["node_modules", "dist"],
  "pageObjectPattern": "pages/**/*.ts",
  "specPattern": "**/*.spec.ts",
  "rules": {
    "no-hard-wait": "error",
    "deep-locator": ["warn", { "maxDepth": 3 }],
    "unawaited-action": "error",
    "web-first-assertion": "error",
    "leaky-page-object": "warn",
    "zombie-locator": "warn",
    "no-page-pause": "error",
    "no-focused-test": "error",
    "no-hardcoded-base-url": "warn",
    "no-hardcoded-timeout": ["warn", { "maxTimeout": 5000 }],
    "no-console-in-test": "warn",
    "no-skipped-test": "warn"
  }
}
```

You can also generate a starter config with `pw-eslint --init`.

### Config Schema

| Key | Type | Description |
|-----|------|-------------|
| `include` | `string[]` | Glob patterns for files to analyze |
| `exclude` | `string[]` | Glob patterns for files to exclude |
| `pageObjectPattern` | `string` | Glob for Page Object Model files |
| `specPattern` | `string` | Glob for test spec files |
| `rules` | `object` | Rule severities — `"error"`, `"warn"`, `"off"`, or `["warn", { options }]` |
| `failOn` | `"error" \| "warn"` | Exit 1 when findings of this severity exist (default: `"error"`) |
| `maxWarnings` | `number` | Max warnings before exit 1 (default: unlimited) |
| `categoryFilter` | `string[]` | Run only rules in the specified categories |
| `overrides` | `OverrideEntry[]` | Per-directory rule overrides (see below) |

### Per-Directory Overrides

Override rule severity for specific file patterns:

```json
{
  "overrides": [
    {
      "files": ["tests/smoke/**"],
      "rules": { "no-hard-wait": "warn" }
    },
    {
      "files": ["tests/e2e/**"],
      "rules": { "no-hardcoded-timeout": "off" }
    }
  ]
}
```

The first matching override wins. Unspecified rules inherit the global config.

---

## Built-in Rules

| Rule ID | Default | Fixable | Category | Description |
|---------|---------|---------|----------|-------------|
| `no-hard-wait` | `error` | Yes | flakiness | Disallows `page.waitForTimeout()` and bare `setTimeout()` |
| `deep-locator` | `warn` | No | flakiness | Flags locator chains deeper than `maxDepth` (default: 3) |
| `unawaited-action` | `error` | No | flakiness | Flags Playwright actions called without `await` |
| `zombie-locator` | `warn` | No | flakiness | Flags locators assigned but never used |
| `web-first-assertion` | `error` | Yes | correctness | Enforces web-first assertions (`expect(locator).toBeVisible()`) over manual waits |
| `leaky-page-object` | `warn` | No | hygiene | Flags Page Object methods that return raw Playwright types |
| `no-page-pause` | `error` | Yes | hygiene | Flags `page.pause()` debug calls left in test code |
| `no-focused-test` | `error` | Yes | style | Flags `test.only()` / `it.only()` / `describe.only()` |
| `no-hardcoded-base-url` | `warn` | No | hygiene | Flags hardcoded `http://` / `https://` URLs in `page.goto()` |
| `no-hardcoded-timeout` | `warn` | No | hygiene | Flags hardcoded timeout values (configurable `maxTimeout`) |
| `no-console-in-test` | `warn` | No | hygiene | Flags `console.log/warn/error/debug/info` in spec files |
| `no-skipped-test` | `warn` | Yes | style | Flags `test.skip()` and `test.fixme()` |

### Rule Categories

Rules are grouped into four categories for filtering with `--category`:

| Category | Rules | Purpose |
|----------|-------|---------|
| `flakiness` | `no-hard-wait`, `deep-locator`, `unawaited-action`, `zombie-locator` | Prevent flaky tests |
| `correctness` | `web-first-assertion` | Enforce correct Playwright patterns |
| `hygiene` | `leaky-page-object`, `no-page-pause`, `no-hardcoded-base-url`, `no-hardcoded-timeout`, `no-console-in-test` | Keep code clean |
| `style` | `no-focused-test`, `no-skipped-test` | Enforce consistent style |

### Rule-Specific Options

Some rules accept configuration options:

```json
{
  "rules": {
    "deep-locator": ["warn", { "maxDepth": 4 }],
    "no-hardcoded-timeout": ["warn", { "maxTimeout": 5000 }]
  }
}
```

| Rule | Option | Type | Default | Description |
|------|--------|------|---------|-------------|
| `deep-locator` | `maxDepth` | `number` | `3` | Maximum allowed locator chain depth |
| `no-hardcoded-timeout` | `maxTimeout` | `number` | `0` | Only flag timeouts exceeding this value (0 = flag all) |

---

## Auto-Fix

Five rules support automatic fixing:

| Rule | Fix Action |
|------|------------|
| `no-hard-wait` | Replaces `page.waitForTimeout()` with a TODO comment |
| `web-first-assertion` | Rewrites `expect(await loc.isVisible()).toBe(true)` to `await expect(loc).toBeVisible()` |
| `no-page-pause` | Removes `page.pause()` statements |
| `no-focused-test` | Removes `.only` modifier (`test.only()` -> `test()`) |
| `no-skipped-test` | Removes `.skip` / `.fixme` modifier (`test.skip()` -> `test()`) |

```bash
# Apply fixes
pw-eslint . --fix

# Preview fixes as diff
pw-eslint . --dry-run
```

All fixes are idempotent — running `--fix` twice produces the same result.

---

## Inline Disable Comments

Suppress a finding on the next line:

```typescript
// pw-eslint-disable-next-line no-hard-wait
await page.waitForTimeout(1000);
```

Suppress multiple rules:

```typescript
// pw-eslint-disable-next-line no-hard-wait, deep-locator
await page.locator('div > span > a').waitForTimeout(1000);
```

Rule IDs are case-insensitive.

---

## Rule Explain

Get detailed rationale, examples, and fix guidance for any rule:

```bash
pw-eslint explain no-hard-wait
pw-eslint explain --list
```

The `explain` command shows:
- Rule description and rationale
- Code examples of violations
- Fix guidance
- Category and severity

---

## CI Integration

### GitHub Actions Annotations

Use `--format github` to produce inline annotations in GitHub Actions:

```yaml
- run: npx pw-eslint . --format github
```

### Staged Files (Pre-Commit)

Analyze only git-staged files:

```bash
pw-eslint . --staged
```

### Write Report to File

```bash
pw-eslint . --format junit --output-file reports/pw-eslint.xml
```

### Warning Threshold

Fail the build if warnings exceed a limit:

```bash
pw-eslint . --max-warnings 10
```

### Fail on Warnings

Configure when the CLI exits with code 1:

```json
{
  "failOn": "warn"
}
```

---

## Baseline Comparison

Save current findings as a baseline, then detect regressions:

```bash
# Save baseline
pw-eslint . --format json > baseline.json

# Later, compare against baseline
pw-eslint . --compare baseline.json
```

With `--compare`:
- Exit 0 if no **new** violations were introduced
- Exit 1 if **new** violations exist (regressions)
- Fixed violations are reported but don't affect exit code

---

## Custom Rules

Custom rules are loaded from `.pw-eslint/rules/*.js` relative to your project root.

> **Security Warning:** Custom rules are **trusted code**. They run in the same Node.js process as the CLI with no sandboxing. **Do not load rules from untrusted sources.** Only use rules written and reviewed by your own team.

### Rule File Structure

Each rule file must export a `RuleDefinition` object as its **default export**:

```js
// .pw-eslint/rules/no-console-log.js
export default {
  apiVersion: 1,
  id: 'no-console-log',
  description: 'Disallows console.log in test files',
  defaultSeverity: 'warn',
  fixable: false,
  check(context) {
    const calls = context.sourceFile.getDescendantsOfKind(
      /* SyntaxKind.CallExpression */ 213
    );
    for (const call of calls) {
      if (call.getExpression().getText() === 'console.log') {
        context.report(call, 'Avoid console.log in tests');
      }
    }
  },
};
```

### `RuleDefinition` Interface

```typescript
interface RuleDefinition {
  apiVersion: 1;                          // must be exactly 1
  id: string;                             // unique rule identifier
  description: string;                    // human-readable description
  defaultSeverity: 'error' | 'warn';     // default severity when enabled
  fixable: boolean;                       // whether fix() is implemented
  category?: string;                      // rule category for filtering
  explain?: RuleExplainData;              // rationale, examples, fix guidance
  check(context: RuleContext): void;      // analysis logic
  fix?(context: FixContext): void;        // optional auto-fix logic
}
```

### `RuleContext` Interface

```typescript
interface RuleContext {
  sourceFile: SourceFile;               // ts-morph SourceFile
  project: Project;                     // ts-morph Project
  config: ResolvedConfig;               // resolved CLI config
  report(node: Node, message: string, suggestion?: string): void;
}
```

### Configuring Custom Rules

Once a custom rule file exists, configure it in `.pw-eslintrc.json` just like any built-in rule:

```json
{
  "rules": {
    "no-console-log": "warn"
  }
}
```

### API Versioning

The `apiVersion` field guards against breaking changes. The current supported version is `1`. If you upgrade the CLI and the API changes, the CLI will exit with code `2` and tell you which rule needs updating.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success — no violations matching `failOn` severity |
| `1` | Analysis completed — violations found, `--max-warnings` exceeded, or regressions detected with `--compare` |
| `2` | Configuration error, plugin load failure, file not found, or usage error |

---

## Security

`@pw-eslint/cli` requires filesystem access to read configurations and analyze test files. If you're using this as a library and want to restrict access, see [SECURITY.md](SECURITY.md) for how to provide a custom `FileSystem` implementation.

## License

MIT — see [LICENSE](LICENSE).