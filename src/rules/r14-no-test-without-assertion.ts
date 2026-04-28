import { SyntaxKind } from 'ts-morph';
import picomatch from 'picomatch';
import { relative } from 'node:path';
import type { RuleDefinition } from '../domain/rule.js';

const TEST_NAMES = new Set(['test', 'it']);

export const r14NoTestWithoutAssertion: RuleDefinition = {
  apiVersion: 1,
  id: 'no-test-without-assertion',
  description: 'Warns when a test() or it() block contains no expect() call.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'correctness',
  explain: {
    rationale:
      'A test with no expect() will always pass, giving false confidence. ' +
      'Every test should assert at least one observable outcome.',
    examples: [
      `// ❌ Always passes silently\ntest('checkout', async ({ page }) => {\n  await page.goto('/cart');\n});`,
    ],
    fixGuidance:
      'Add at least one expect() call that verifies an observable outcome of the action being tested.',
  },

  check(context) {
    const { sourceFile, config } = context;
    const filePath = sourceFile.getFilePath();

    const relPath = relative(process.cwd(), filePath).replace(/\\/g, '/');
    const isSpec =
      picomatch.isMatch(relPath, config.specPattern) ||
      picomatch.isMatch(relPath, '**/*.spec.ts') ||
      picomatch.isMatch(relPath, '**/*.spec.js');

    if (!isSpec) return;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      if (callee.getKind() !== SyntaxKind.Identifier) return;
      if (!TEST_NAMES.has(callee.asKindOrThrow(SyntaxKind.Identifier).getText())) return;

      const args = callExpr.getArguments();
      const callback = [...args]
        .reverse()
        .find(
          (a) =>
            a.getKind() === SyntaxKind.ArrowFunction ||
            a.getKind() === SyntaxKind.FunctionExpression
        );

      if (!callback) return;

      const hasExpect = callback.getDescendantsOfKind(SyntaxKind.CallExpression).some((ce) => {
        const cCallee = ce.getExpression();

        if (cCallee.getKind() === SyntaxKind.Identifier) {
          return cCallee.asKindOrThrow(SyntaxKind.Identifier).getText() === 'expect';
        }

        if (cCallee.getKind() === SyntaxKind.PropertyAccessExpression) {
          const base = cCallee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getExpression();
          return (
            base.getKind() === SyntaxKind.Identifier &&
            base.asKindOrThrow(SyntaxKind.Identifier).getText() === 'expect'
          );
        }

        return false;
      });

      if (!hasExpect) {
        context.report(
          callExpr,
          'Test has no assertion; add at least one expect() or it will always pass'
        );
      }
    });
  },
};
