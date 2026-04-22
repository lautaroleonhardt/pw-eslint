import { SyntaxKind } from 'ts-morph';
import type { RuleDefinition, FixContext } from '../domain/rule.js';

const TEST_NAMES = new Set(['test', 'it', 'describe']);

export const r08NoFocusedTest: RuleDefinition = {
  apiVersion: 1,
  id: 'no-focused-test',
  description: 'Disallows test.only() / it.only() / describe.only() which skips other tests.',
  defaultSeverity: 'error',
  fixable: true,
  category: 'style',
  explain: {
    rationale:
      'test.only() makes Playwright run only the focused test and skip all others. ' +
      'When committed, it silently suppresses the entire test suite in CI, ' +
      'giving a false sense of passing coverage.',
    examples: [
      `// ❌ Only this test runs — all others are skipped\ntest.only('critical path', async ({ page }) => { ... });`,
      `// ❌ Focused describe block\ndescribe.only('Login', () => { ... });`,
    ],
    fixGuidance:
      'Remove the .only modifier: change test.only(...) to test(...). ' +
      'To run a single test locally, use the Playwright VS Code extension or pass --grep from the CLI.',
  },

  check(context) {
    const { sourceFile } = context;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const prop = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const propertyName = prop.getName();

      if (propertyName !== 'only') return;

      const obj = prop.getExpression();
      if (obj.getKind() !== SyntaxKind.Identifier) return;

      const objName = obj.asKindOrThrow(SyntaxKind.Identifier).getText();
      if (!TEST_NAMES.has(objName)) return;

      context.report(
        callExpr,
        'test.only() causes all other tests to be skipped in CI; remove the .only modifier',
      );
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

      // Replace test.only with test (removes the .only modifier)
      prop.replaceWithText(obj.getText());
    }
  },
};
