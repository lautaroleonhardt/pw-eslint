import { SyntaxKind } from 'ts-morph';
import type { RuleDefinition } from '../domain/rule.js';
import type { FixContext } from '../domain/rule.js';

export const r01NoHardWait: RuleDefinition = {
  apiVersion: 1,
  id: 'no-hard-wait',
  description: 'Disallows waitForTimeout() calls in favour of web-first waiting mechanisms.',
  defaultSeverity: 'error',
  fixable: true,
  category: 'flakiness',
  explain: {
    rationale:
      'waitForTimeout() introduces a fixed time delay that makes tests slow and brittle. ' +
      'If the app is slower than the hardcoded value, the test still fails; if it is faster, ' +
      'time is wasted. Playwright provides built-in auto-retry mechanisms that wait only as long as needed.',
    examples: [
      `// ❌ Flaky: pauses for 2 seconds regardless of app state\nawait page.waitForTimeout(2000);\nawait page.click('#submit');`,
      `// ❌ Fragile: fixed delay before assertion\nawait page.waitForTimeout(500);\nawait expect(page.locator('.toast')).toBeVisible();`,
    ],
    fixGuidance:
      'Replace waitForTimeout() with a web-first mechanism:\n' +
      '  • await page.waitForSelector("#element")\n' +
      '  • await expect(locator).toBeVisible()\n' +
      '  • await page.waitForURL("/target")\n' +
      'The --fix flag inserts a TODO comment to guide manual replacement.',
  },

  check(context) {
    const { sourceFile } = context;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      let methodName: string | undefined;

      if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        methodName = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
      } else if (callee.getKind() === SyntaxKind.Identifier) {
        methodName = callee.asKindOrThrow(SyntaxKind.Identifier).getText();
      }

      if (methodName === 'waitForTimeout') {
        context.report(
          callExpr,
          'Avoid waitForTimeout() — it creates fragile, time-based waits.',
          'Replace with a web-first mechanism: waitForSelector(), expect(locator).toBeVisible(), or waitForURL().'
        );
      }
    });
  },

  fix(context: FixContext) {
    const { sourceFile, findings } = context;

    // Process findings right-to-left by position to avoid offset drift
    const sorted = [...findings].sort((a, b) => b.line - a.line || b.column - a.column);

    for (const finding of sorted) {
      // Find the CallExpression at the reported line/column
      const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      const target = callExprs.find((ce) => {
        const pos = sourceFile.getLineAndColumnAtPos(ce.getStart());
        return pos.line + 1 === finding.line && pos.column + 1 === finding.column;
      });

      if (!target) continue;

      // Locate the ancestor ExpressionStatement to replace the whole statement
      let ancestor = target.getParent();
      while (ancestor && ancestor.getKind() !== SyntaxKind.ExpressionStatement) {
        ancestor = ancestor.getParent();
      }

      if (!ancestor) continue;

      // Preserve leading indentation
      const stmtText = ancestor.getFullText();
      const leadingMatch = stmtText.match(/^(\s*)/);
      const indent = leadingMatch ? leadingMatch[1] : '';

      ancestor.replaceWithText(
        `${indent}/* TODO: replace waitForTimeout with a Playwright web-first waiting mechanism */`
      );
    }
  },
};
