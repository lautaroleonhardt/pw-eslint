import { SyntaxKind } from 'ts-morph';
import type { RuleDefinition } from '../domain/rule.js';
import type { RuleOptions } from '../domain/config.js';

const TARGET_METHODS = new Set(['locator', 'waitForSelector', 'frameLocator']);

function getMaxDepth(options: RuleOptions): number {
  const v = options['maxDepth'];
  return typeof v === 'number' ? v : 3;
}

/**
 * Count CSS combinators in a selector string.
 * Tracks bracket/paren nesting so content inside [] and () is ignored.
 */
function countCssCombinators(selector: string): number {
  let depth = 0;
  let nesting = 0;
  let i = 0;

  while (i < selector.length) {
    const ch = selector[i]!;

    if (ch === '[' || ch === '(') {
      nesting++;
      i++;
      continue;
    }
    if (ch === ']' || ch === ')') {
      nesting = Math.max(0, nesting - 1);
      i++;
      continue;
    }
    if (nesting > 0) {
      i++;
      continue;
    }

    // Explicit combinators
    if (ch === '>' || ch === '+' || ch === '~') {
      depth++;
      // consume surrounding whitespace (it's padding, not an extra combinator)
      while (i + 1 < selector.length && /\s/.test(selector[i + 1]!)) i++;
      i++;
      continue;
    }

    // Potential descendant combinator (whitespace between two parts)
    if (/\s/.test(ch)) {
      // skip all whitespace
      let j = i + 1;
      while (j < selector.length && /\s/.test(selector[j]!)) j++;

      if (j < selector.length) {
        const next = selector[j]!;
        // If what follows the whitespace is NOT another combinator or end-of-group,
        // the whitespace itself is a descendant combinator
        if (next !== '>' && next !== '+' && next !== '~' && next !== ',' && next !== ')') {
          depth++;
        }
      }
      i = j;
      continue;
    }

    i++;
  }

  return depth;
}

function isXPath(selector: string): boolean {
  return selector.startsWith('/') || /^xpath=/i.test(selector);
}

function countXPathDepth(selector: string): number {
  const s = selector.replace(/^xpath=/i, '');
  // split on one or more slashes; each non-empty segment is a step
  const steps = s.split(/\/+/).filter(Boolean);
  return Math.max(0, steps.length - 1);
}

function maxDepthAcrossSelectors(selector: string, countFn: (s: string) => number): number {
  return selector.split(',').reduce((max, part) => {
    return Math.max(max, countFn(part.trim()));
  }, 0);
}

export const r02DeepLocator: RuleDefinition = {
  apiVersion: 1,
  id: 'deep-locator',
  description: 'Warns when a CSS/XPath selector exceeds the configured depth threshold.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'flakiness',
  explain: {
    rationale:
      'Deeply nested CSS or XPath selectors are tightly coupled to DOM structure. ' +
      'Any change to the markup breaks the selector, causing test flakiness. ' +
      'Semantic locators like getByRole() or getByTestId() are resilient to structure changes.',
    examples: [
      `// ❌ Deeply nested CSS (depth 4)\nawait page.locator('div.container > ul > li > a.nav-link').click();`,
      `// ❌ Long XPath chain\nawait page.locator('//div/ul/li/span/button').click();`,
      `// ✅ Semantic locator — resilient to DOM changes\nawait page.getByRole('button', { name: 'Submit' }).click();`,
    ],
    fixGuidance:
      'Replace deep selectors with semantic Playwright locators:\n' +
      '  • page.getByRole("button", { name: "..." })\n' +
      '  • page.getByLabel("Field name")\n' +
      '  • page.getByTestId("element-id")\n' +
      'Adjust maxDepth via config: ["warn", { "maxDepth": 2 }]',
  },

  check(context) {
    const { sourceFile, config } = context;
    const ruleEntry = config.rules['deep-locator'];
    const options: RuleOptions = Array.isArray(ruleEntry) && ruleEntry[1] ? ruleEntry[1] : {};
    const maxDepth = getMaxDepth(options);

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();
      if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return;

      const methodName = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
      if (!TARGET_METHODS.has(methodName)) return;

      const args = callExpr.getArguments();
      if (args.length === 0) return;

      const firstArg = args[0]!;

      // Template literal with expressions → dynamic, cannot analyze
      if (firstArg.getKind() === SyntaxKind.TemplateExpression) {
        context.report(
          firstArg,
          'Dynamic selector cannot be statically analyzed.',
          'Use a string literal selector to enable depth analysis.'
        );
        return;
      }

      if (firstArg.getKind() !== SyntaxKind.StringLiteral) return;

      const selector = firstArg.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();

      const depth = isXPath(selector)
        ? maxDepthAcrossSelectors(selector, countXPathDepth)
        : maxDepthAcrossSelectors(selector, countCssCombinators);

      if (depth > maxDepth) {
        context.report(
          firstArg,
          `Selector depth (${depth}) exceeds maxDepth (${maxDepth}).`,
          'Simplify your selector or use semantic locators like getByRole(), getByLabel(), or getByTestId().'
        );
      }
    });
  },
};
