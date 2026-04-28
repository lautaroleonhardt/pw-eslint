import { SyntaxKind, Node } from 'ts-morph';
import type { RuleDefinition } from '../domain/rule.js';

const ASYNC_METHODS = new Set([
  // Navigation
  'goto',
  'reload',
  'goBack',
  'goForward',
  'waitForURL',
  'waitForNavigation',
  // Interaction
  'click',
  'dblclick',
  'tap',
  'fill',
  'type',
  'press',
  'selectOption',
  'check',
  'uncheck',
  'focus',
  'blur',
  'hover',
  'dragTo',
  'dispatchEvent',
  'inputValue',
  'selectText',
  // Waiting
  'waitForSelector',
  'waitForFunction',
  'waitForEvent',
  'waitForLoadState',
  // State checks
  'isVisible',
  'isEnabled',
  'isChecked',
  'isDisabled',
  'isEditable',
  // Content
  'innerHTML',
  'innerText',
  'textContent',
  'getAttribute',
  'count',
  'boundingBox',
  // Other
  'screenshot',
  'setInputFiles',
  'evaluate',
  'evaluateHandle',
  // Expect timeout options
  'expect',
]);

function isPlaywrightMethodCall(methodName: string | undefined): boolean {
  return ASYNC_METHODS.has(methodName ?? '');
}

export const r10NoHardcodedTimeout: RuleDefinition = {
  apiVersion: 1,
  id: 'no-hardcoded-timeout',
  description: 'Disallows hardcoded numeric timeout values in Playwright method calls.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'hygiene',
  explain: {
    rationale:
      'Hardcoded timeout values are scattered magic numbers that are hard to tune globally. ' +
      'They cause inconsistency across tests and make CI environment adjustments require grep-and-replace.',
    examples: [
      `// ❌ Magic number timeout\nawait page.click('#submit', { timeout: 5000 });`,
      `// ❌ Hardcoded in expect\nawait expect(page.locator('.dialog')).toBeVisible({ timeout: 10000 });`,
      `// ✅ Shared constant\nconst DEFAULT_TIMEOUT = 5000;\nawait page.click('#submit', { timeout: DEFAULT_TIMEOUT });`,
    ],
    fixGuidance:
      'Extract timeout values to named constants or configure a global default in playwright.config.ts:\n' +
      '  use: { actionTimeout: 5000, navigationTimeout: 30000 }',
  },

  check(context) {
    const { sourceFile, config } = context;

    const ruleEntry = config.rules['no-hardcoded-timeout'];
    const options =
      Array.isArray(ruleEntry) && ruleEntry[1] ? (ruleEntry[1] as Record<string, unknown>) : {};
    const maxTimeout =
      typeof options['maxTimeout'] === 'number' && options['maxTimeout'] >= 0
        ? options['maxTimeout']
        : 0;

    // Find all PropertyAssignments with key 'timeout'
    sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAssignment).forEach((prop) => {
      const key = prop.getChildAtIndex(0);
      if (!key) return;

      // Check if key is 'timeout'
      let keyName: string | undefined;
      if (key.getKind() === SyntaxKind.Identifier) {
        keyName = key.asKindOrThrow(SyntaxKind.Identifier).getText();
      } else if (key.getKind() === SyntaxKind.StringLiteral) {
        keyName = key.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
      }

      if (keyName !== 'timeout') return;

      // Check value is a NumericLiteral
      const value = prop.getInitializer();
      if (!value || value.getKind() !== SyntaxKind.NumericLiteral) return;

      const timeoutMs = value.asKindOrThrow(SyntaxKind.NumericLiteral).getLiteralValue();

      if (timeoutMs <= maxTimeout) return;

      // Find the parent ObjectLiteral
      const objLiteral = prop.getParent();
      if (!objLiteral || objLiteral.getKind() !== SyntaxKind.ObjectLiteralExpression) return;

      // Find the CallExpression that uses this object as an argument
      let callExpr: Node | undefined = objLiteral.getParent();
      while (callExpr && callExpr.getKind() !== SyntaxKind.CallExpression) {
        callExpr = callExpr.getParent();
      }

      if (!callExpr) return;

      // Check if it's a Playwright method call
      const callee = callExpr.asKindOrThrow(SyntaxKind.CallExpression).getExpression();
      let methodName: string | undefined;

      if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        methodName = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
      } else if (callee.getKind() === SyntaxKind.Identifier) {
        methodName = callee.asKindOrThrow(SyntaxKind.Identifier).getText();
      }

      if (!isPlaywrightMethodCall(methodName)) return;

      context.report(
        value,
        `Hardcoded timeout ${timeoutMs}ms; use a shared constant or playwright.config.ts instead`
      );
    });
  },
};
