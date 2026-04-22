import { SyntaxKind } from 'ts-morph';
import type { RuleDefinition, FixContext } from '../domain/rule.js';

const STATE_CHECK_METHODS = new Set([
  'isVisible', 'isEnabled', 'isChecked', 'isDisabled', 'isEditable',
]);

const WEB_FIRST_MAP: Record<string, Record<string, string>> = {
  isVisible:   { true: 'toBeVisible()',  false: 'not.toBeVisible()' },
  isEnabled:   { true: 'toBeEnabled()',  false: 'not.toBeEnabled()' },
  isChecked:   { true: 'toBeChecked()',  false: 'not.toBeChecked()' },
  isDisabled:  { true: 'toBeDisabled()', false: 'not.toBeDisabled()' },
  isEditable:  { true: 'toBeEditable()', false: 'not.toBeEditable()' },
};

export const r05WebFirstAssertion: RuleDefinition = {
  apiVersion: 1,
  id: 'web-first-assertion',
  description: 'Flags non-web-first assertions and suggests Playwright auto-retry matchers.',
  defaultSeverity: 'error',
  fixable: true,
  category: 'correctness',
  explain: {
    rationale:
      'Non-web-first assertions like expect(await locator.isVisible()).toBe(true) resolve the ' +
      'locator state once and assert immediately, bypassing Playwright\'s auto-retry mechanism. ' +
      'Web-first assertions like expect(locator).toBeVisible() automatically retry until the ' +
      'condition is met or the timeout expires, making tests far more reliable.',
    examples: [
      `// ❌ Non-web-first: no auto-retry, race condition prone\nexpect(await page.locator('.modal').isVisible()).toBe(true);`,
      `// ❌ Non-web-first with isEnabled\nexpect(await page.locator('#submit').isEnabled()).toEqual(true);`,
      `// ✅ Web-first: auto-retries until visible or timeout\nawait expect(page.locator('.modal')).toBeVisible();`,
    ],
    fixGuidance:
      'Use Playwright web-first matchers:\n' +
      '  • expect(locator).toBeVisible()\n' +
      '  • expect(locator).toBeEnabled()\n' +
      '  • expect(locator).toBeChecked()\n' +
      '  • expect(locator).toBeDisabled()\n' +
      '  • expect(locator).toBeEditable()\n' +
      'The --fix flag auto-converts toBe(true/false) and toEqual(true/false) patterns.',
  },

  check(context) {
    const { sourceFile } = context;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((outerCall) => {
      const outerCallee = outerCall.getExpression();
      if (outerCallee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const assertionMethod = outerCallee
        .asKindOrThrow(SyntaxKind.PropertyAccessExpression)
        .getName();

      const isToBe = assertionMethod === 'toBe';
      const isToEqual = assertionMethod === 'toEqual';
      const isTruthy = assertionMethod === 'toBeTruthy';
      const isFalsy = assertionMethod === 'toBeFalsy';

      if (!isToBe && !isToEqual && !isTruthy && !isFalsy) return;

      // Resolve bool value for toBe/toEqual (truthy/falsy have no arg)
      let boolKey: 'true' | 'false' | null = null;
      if (isToBe || isToEqual) {
        const args = outerCall.getArguments();
        if (args.length !== 1) return;
        const argKind = args[0]!.getKind();
        if (argKind === SyntaxKind.TrueKeyword) boolKey = 'true';
        else if (argKind === SyntaxKind.FalseKeyword) boolKey = 'false';
        else return;
      }

      // Get the expect(...) call — receiver of .toBe()
      const expectCall = outerCallee
        .asKindOrThrow(SyntaxKind.PropertyAccessExpression)
        .getExpression();
      if (expectCall.getKind() !== SyntaxKind.CallExpression) return;

      const expectCallExpr = expectCall.asKindOrThrow(SyntaxKind.CallExpression);
      const expectCallee = expectCallExpr.getExpression();
      if (expectCallee.getKind() !== SyntaxKind.Identifier) return;
      if (expectCallee.asKindOrThrow(SyntaxKind.Identifier).getText() !== 'expect') return;

      // Get the argument to expect() — must be an AwaitExpression
      const expectArgs = expectCallExpr.getArguments();
      if (expectArgs.length !== 1) return;
      const awaitExpr = expectArgs[0]!;
      if (awaitExpr.getKind() !== SyntaxKind.AwaitExpression) return;

      // Get the call inside await — must be locator.<stateCheck>()
      const awaitedExpr = awaitExpr
        .asKindOrThrow(SyntaxKind.AwaitExpression)
        .getExpression();
      if (awaitedExpr.getKind() !== SyntaxKind.CallExpression) return;

      const innerCallee = awaitedExpr
        .asKindOrThrow(SyntaxKind.CallExpression)
        .getExpression();
      if (innerCallee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const innerProp = innerCallee.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const stateCheck = innerProp.getName();
      if (!STATE_CHECK_METHODS.has(stateCheck)) return;

      const locatorText = innerProp.getExpression().getText();

      if (isTruthy || isFalsy) {
        context.report(
          outerCall,
          `Non-web-first assertion: \`expect(await ${locatorText}.${stateCheck}()).${assertionMethod}()\` cannot be auto-fixed (semantic ambiguity).`,
          `Use \`await expect(${locatorText}).${WEB_FIRST_MAP[stateCheck]?.['true'] ?? stateCheck}()\` for reliable auto-retry.`,
        );
        return;
      }

      const matcher = WEB_FIRST_MAP[stateCheck]?.[boolKey!];
      if (!matcher) return;

      context.report(
        outerCall,
        `Non-web-first assertion: \`expect(await ${locatorText}.${stateCheck}()).${assertionMethod}(${boolKey})\`.`,
        `Use \`await expect(${locatorText}).${matcher}\` instead.`,
      );
    });
  },

  fix(context: FixContext) {
    const { sourceFile, findings } = context;

    // Process right-to-left to avoid offset drift
    const sorted = [...findings].sort((a, b) => b.line - a.line || b.column - a.column);

    for (const finding of sorted) {
      // Skip findings flagged as not auto-fixable (toBeTruthy/toBeFalsy)
      if (finding.message.includes('cannot be auto-fixed')) continue;

      // Find the outer CallExpression at the reported position
      const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      const outerCall = callExprs.find((ce) => {
        const pos = sourceFile.getLineAndColumnAtPos(ce.getStart());
        return pos.line + 1 === finding.line && pos.column + 1 === finding.column;
      });

      if (!outerCall) continue;

      // Re-parse the pattern from the node to extract locatorText and matcher
      const outerCallee = outerCall.getExpression();
      if (outerCallee.getKind() !== SyntaxKind.PropertyAccessExpression) continue;

      const assertionMethod = outerCallee
        .asKindOrThrow(SyntaxKind.PropertyAccessExpression)
        .getName();

      const isToBe = assertionMethod === 'toBe';
      const isToEqual = assertionMethod === 'toEqual';
      if (!isToBe && !isToEqual) continue;

      const args = outerCall.getArguments();
      if (args.length !== 1) continue;
      const argKind = args[0]!.getKind();
      let boolKey: 'true' | 'false' | null = null;
      if (argKind === SyntaxKind.TrueKeyword) boolKey = 'true';
      else if (argKind === SyntaxKind.FalseKeyword) boolKey = 'false';
      else continue;

      const expectCall = outerCallee
        .asKindOrThrow(SyntaxKind.PropertyAccessExpression)
        .getExpression();
      if (expectCall.getKind() !== SyntaxKind.CallExpression) continue;

      const expectCallExpr = expectCall.asKindOrThrow(SyntaxKind.CallExpression);
      const expectArgs = expectCallExpr.getArguments();
      if (expectArgs.length !== 1) continue;

      const awaitExpr = expectArgs[0]!;
      if (awaitExpr.getKind() !== SyntaxKind.AwaitExpression) continue;

      const awaitedExpr = awaitExpr
        .asKindOrThrow(SyntaxKind.AwaitExpression)
        .getExpression();
      if (awaitedExpr.getKind() !== SyntaxKind.CallExpression) continue;

      const innerCallee = awaitedExpr
        .asKindOrThrow(SyntaxKind.CallExpression)
        .getExpression();
      if (innerCallee.getKind() !== SyntaxKind.PropertyAccessExpression) continue;

      const innerProp = innerCallee.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
      const stateCheck = innerProp.getName();
      if (!STATE_CHECK_METHODS.has(stateCheck)) continue;

      const locatorText = innerProp.getExpression().getText();
      const matcher = WEB_FIRST_MAP[stateCheck]?.[boolKey];
      if (!matcher) continue;

      outerCall.replaceWithText(`await expect(${locatorText}).${matcher}`);
    }
  },
};
