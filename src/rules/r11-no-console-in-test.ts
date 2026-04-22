import { SyntaxKind } from 'ts-morph';
import picomatch from 'picomatch';
import { relative } from 'node:path';
import type { RuleDefinition } from '../domain/rule.js';

const CONSOLE_METHODS = new Set(['log', 'warn', 'error', 'debug', 'info']);

export const r11NoConsoleInTest: RuleDefinition = {
  apiVersion: 1,
  id: 'no-console-in-test',
  description: 'Disallows console.* calls in spec files.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'hygiene',
  explain: {
    rationale:
      'console.log/warn/error calls in test files are debugging artifacts. ' +
      'They pollute CI output, making it harder to spot real failures, ' +
      'and indicate code that was not cleaned up before committing.',
    examples: [
      `// ❌ Debug logging left in test\ntest('checkout', async ({ page }) => {\n  console.log('Starting checkout test');\n  await page.goto('/cart');\n  console.log(await page.title());\n});`,
    ],
    fixGuidance:
      'Remove console.* calls from test files. ' +
      'For diagnostic output, use Playwright\'s built-in test.info().annotations or playwright reporter instead.',
  },

  check(context) {
    const { sourceFile, config } = context;
    const filePath = sourceFile.getFilePath();

    // File-scope filtering: only run in spec files
    const relPath = relative(process.cwd(), filePath).replace(/\\/g, '/');
    const isSpec = picomatch.isMatch(relPath, config.specPattern) ||
                   picomatch.isMatch(relPath, '**/*.spec.ts') ||
                   picomatch.isMatch(relPath, '**/*.spec.js');

    if (!isSpec) return;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const prop = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const methodName = prop.getName();

      if (!CONSOLE_METHODS.has(methodName)) return;

      const obj = prop.getExpression();
      if (obj.getKind() !== SyntaxKind.Identifier) return;

      const objName = obj.asKindOrThrow(SyntaxKind.Identifier).getText();
      if (objName !== 'console') return;

      context.report(
        callExpr,
        `console.${methodName}() left in test file; remove before committing`,
      );
    });
  },
};
