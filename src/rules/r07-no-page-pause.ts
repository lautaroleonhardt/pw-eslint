import { SyntaxKind } from 'ts-morph';
import type { RuleDefinition, FixContext } from '../domain/rule.js';

export const r07NoPagePause: RuleDefinition = {
  apiVersion: 1,
  id: 'no-page-pause',
  description: 'Disallows page.pause() calls which halt test execution.',
  defaultSeverity: 'error',
  fixable: true,
  category: 'hygiene',
  explain: {
    rationale:
      'page.pause() opens Playwright Inspector and halts test execution indefinitely. ' +
      'It is a debugging tool that should never be committed; it causes CI to hang.',
    examples: [
      `// ❌ Debugging artifact left in code\nawait page.goto('/dashboard');\nawait page.pause(); // hangs CI\nawait page.click('#submit');`,
    ],
    fixGuidance:
      'Remove page.pause() before committing. ' +
      'For interactive debugging, use the PWDEBUG=1 environment variable instead of committing pause calls.',
  },

  check(context) {
    const { sourceFile } = context;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const methodName = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();

      if (methodName === 'pause') {
        context.report(callExpr, 'page.pause() halts test execution; remove before committing');
      }
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

      // Walk up to ExpressionStatement (may pass through AwaitExpression)
      let ancestor = target.getParent();
      while (ancestor && ancestor.getKind() !== SyntaxKind.ExpressionStatement) {
        ancestor = ancestor.getParent();
      }

      if (!ancestor) continue;

      ancestor.asKindOrThrow(SyntaxKind.ExpressionStatement).remove();
    }
  },
};
