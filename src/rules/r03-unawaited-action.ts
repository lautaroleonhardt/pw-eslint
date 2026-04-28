import { Node, SyntaxKind } from 'ts-morph';
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
]);

const STATEMENT_KINDS = new Set([
  SyntaxKind.ExpressionStatement,
  SyntaxKind.VariableStatement,
  SyntaxKind.ReturnStatement,
  SyntaxKind.IfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.WhileStatement,
  SyntaxKind.DoStatement,
  SyntaxKind.ThrowStatement,
  SyntaxKind.SwitchStatement,
  SyntaxKind.TryStatement,
  SyntaxKind.Block,
]);

function isStatement(node: Node): boolean {
  return STATEMENT_KINDS.has(node.getKind());
}

function isInsidePromiseAll(callExpr: Node): boolean {
  const parent = callExpr.getParent();
  if (!parent || parent.getKind() !== SyntaxKind.ArrayLiteralExpression) return false;

  const grandparent = parent.getParent();
  if (!grandparent || grandparent.getKind() !== SyntaxKind.CallExpression) return false;

  const gpCallee = grandparent.asKindOrThrow(SyntaxKind.CallExpression).getExpression().getText();

  return gpCallee === 'Promise.all' || gpCallee === 'Promise.allSettled';
}

function isAwaited(callExpr: Node): boolean {
  let node: Node = callExpr;

  while (true) {
    const parent = node.getParent();
    if (!parent) return false;

    if (parent.getKind() === SyntaxKind.AwaitExpression) return true;
    if (isStatement(parent)) return false;

    node = parent;
  }
}

export const r03UnawaitedAction: RuleDefinition = {
  apiVersion: 1,
  id: 'unawaited-action',
  description: 'Flags async Playwright methods called without await.',
  defaultSeverity: 'error',
  fixable: false,
  category: 'flakiness',
  explain: {
    rationale:
      'Playwright actions like click(), fill(), and goto() are asynchronous. ' +
      'Calling them without await means the test continues before the action completes, ' +
      'leading to race conditions and intermittent failures.',
    examples: [
      `// ❌ Missing await — click fires but test continues immediately\npage.click('#submit');\nawait expect(page.locator('.result')).toBeVisible();`,
      `// ❌ Unawaited navigation\npage.goto('/dashboard');\nawait page.locator('h1').textContent();`,
      `// ✅ Correct — await ensures action completes\nawait page.click('#submit');\nawait expect(page.locator('.result')).toBeVisible();`,
    ],
    fixGuidance:
      'Add await before the Playwright method call. ' +
      'If running calls in parallel is intentional, wrap in Promise.all():\n' +
      '  await Promise.all([page.click("#a"), page.click("#b")])',
  },

  check(context) {
    const { sourceFile } = context;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();
      if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const methodName = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
      if (!ASYNC_METHODS.has(methodName)) return;

      if (isInsidePromiseAll(callExpr)) return;
      if (isAwaited(callExpr)) return;

      context.report(
        callExpr,
        `\`${methodName}()\` is async but called without \`await\`.`,
        `Add 'await' before the call to ensure it completes before continuing.`
      );
    });
  },
};
