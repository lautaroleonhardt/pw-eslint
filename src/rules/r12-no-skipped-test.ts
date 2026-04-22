import { SyntaxKind } from 'ts-morph';
import type { RuleDefinition, FixContext } from '../domain/rule.js';

const TEST_NAMES = new Set(['test', 'it', 'describe']);

export const r12NoSkippedTest: RuleDefinition = {
  apiVersion: 1,
  id: 'no-skipped-test',
  description: 'Flags test.skip() calls which disable tests.',
  defaultSeverity: 'warn',
  fixable: true,
  category: 'style',
  explain: {
    rationale:
      'test.skip() disables tests, which erodes coverage silently over time. ' +
      'Skipped tests that remain in the codebase are often forgotten and never re-enabled.',
    examples: [
      `// ❌ Skipped test — may never be re-enabled\ntest.skip('payment flow', async ({ page }) => { ... });`,
    ],
    fixGuidance:
      'Fix or remove the skipped test. If the skip is intentional (known bug, platform condition), ' +
      'add a comment explaining why and link to a tracking issue. ' +
      'Suppress the rule per-line with:\n  // pw-eslint-disable-next-line no-skipped-test',
  },

  check(context) {
    const { sourceFile } = context;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const prop = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const propertyName = prop.getName();

      if (propertyName !== 'skip' && propertyName !== 'fixme') return;

      const obj = prop.getExpression();
      if (obj.getKind() !== SyntaxKind.Identifier) return;

      const objName = obj.asKindOrThrow(SyntaxKind.Identifier).getText();
      if (!TEST_NAMES.has(objName)) return;

      const message =
        propertyName === 'fixme'
          ? 'test.fixme() found; test marked as incomplete, fix or remove'
          : 'test.skip() found; fix or remove the test, or disable this rule for intentional skips';

      context.report(callExpr, message);
    });
  },

  fix(context: FixContext) {
    const { sourceFile, findings } = context;

    const sorted = [...findings].sort((a, b) => b.line - a.line || b.column - a.column);

    for (const finding of sorted) {
      const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      const target = callExprs.find((ce) => {
        const pos = sourceFile.getLineAndColumnAtPos(ce.getStart());
        return pos.line + 1 === finding.line && pos.column + 1 === finding.column;
      });

      if (!target) continue;

      const callee = target.getExpression();
      if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) continue;

      const prop = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const obj = prop.getExpression();

      // Replace test.skip / test.fixme with test
      prop.replaceWithText(obj.getText());
    }
  },
};
