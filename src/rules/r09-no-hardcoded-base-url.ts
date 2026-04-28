import { SyntaxKind } from 'ts-morph';
import type { RuleDefinition } from '../domain/rule.js';

const HARDCODED_URL_PATTERN = /^https?:\/\//i;

export const r09NoHardcodedBaseUrl: RuleDefinition = {
  apiVersion: 1,
  id: 'no-hardcoded-base-url',
  description: 'Disallows hardcoded HTTP/HTTPS URLs in page.goto() calls.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'hygiene',
  explain: {
    rationale:
      'Hardcoded base URLs in page.goto() tie tests to a specific environment (e.g., staging). ' +
      'They break when running against different environments (dev, prod) and prevent URL configuration ' +
      "via Playwright's baseURL setting in playwright.config.ts.",
    examples: [
      `// ❌ Hardcoded URL — only works in one environment\nawait page.goto('<YOUR_BASE_URL>/login');`,
      `// ✅ Relative path — works with any baseURL\nawait page.goto('/login');`,
    ],
    fixGuidance:
      'Replace the full URL with a relative path: page.goto("/login"). ' +
      'Set baseURL in playwright.config.ts or read the base URL from an environment variable.',
  },

  check(context) {
    const { sourceFile } = context;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      // Check if callee ends in .goto()
      let methodName: string | undefined;
      if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        methodName = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getName();
      }

      if (methodName !== 'goto') return;

      // Get first argument
      const args = callExpr.getArguments();
      if (args.length === 0) return;

      const firstArg = args[0]!;

      // Only check StringLiteral, not template literals
      if (firstArg.getKind() !== SyntaxKind.StringLiteral) return;

      const urlValue = firstArg.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();

      // Check if it's a hardcoded HTTP/HTTPS URL
      if (HARDCODED_URL_PATTERN.test(urlValue)) {
        context.report(
          firstArg,
          `Hardcoded URL '${urlValue}' in page.goto(); use an environment variable or baseURL config instead`
        );
      }
    });
  },
};
