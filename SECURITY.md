# Security Policy

## Filesystem Access

`pw-eslint` is a static analysis tool that requires filesystem access to read configuration files, Playwright test files, and baseline reports. 

### Why we need Filesystem Access

1.  **Configuration Loading:** We search for `.pw-eslintrc.json` and `package.json` in the project directory to load settings.
2.  **Test Analysis:** We read Playwright test files (`*.spec.ts`, `*.test.ts`, etc.) to perform AST-based static analysis.
3.  **Baseline Management:** We read and write JSON baseline files (via the `--compare` or `--baseline` options) to track known violations.
4.  **Custom Rules:** We load custom rule definitions from the `.pw-eslint/rules/` directory using dynamic imports.
5.  **Project Initialization:** The `--init` command writes a default configuration file to the disk.

### Mitigations

If you use `pw-eslint` as a library and want to restrict its filesystem access, you can provide a custom `FileSystem` implementation:

```typescript
import { loadConfig, NodeFileSystem, type FileSystem } from 'pw-eslint';

class RestrictedFileSystem extends NodeFileSystem {
  readFile(path: string): string {
    if (!path.endsWith('.pw-eslintrc.json')) {
      throw new Error('Access denied');
    }
    return super.readFile(path);
  }
}

const config = loadConfig(process.cwd(), undefined, new RestrictedFileSystem());
```

Alternatively, you can provide an entirely virtual filesystem implementation by implementing the `FileSystem` interface.

### Dynamic Imports

Custom rules are loaded using Node.js dynamic `import()`. This requires that the rules are present on the disk as valid JavaScript files. We only load files matching the `.pw-eslint/rules/*.js` pattern.

## Reporting a Vulnerability

If you find a security vulnerability, please report it via [GitHub Issues](https://github.com/playwright-audit/pw-eslint/issues).

## Security Analysis & Accepted Risks

The following alerts from dependency scanners (e.g., Socket.dev) have been investigated and determined to be low-risk or false positives:

### path-browserify (Unmaintained)
- **Status:** Accepted Risk
- **Reason:** This is a transitive dependency of `ts-morph`. It is a stable, widely-used polyfill for the Node `path` module in browser environments. While it hasn't had a release since 2019, its functionality is complete and stable for its intended use case.

### @ts-morph/common (urlStrings)
- **Status:** False Positive
- **Reason:** This package contains hardcoded URL strings related to TypeScript documentation, schemas, and resource fetching (like `@types`). These are legitimate strings required for the operation of `ts-morph` and do not indicate malicious data exfiltration.
