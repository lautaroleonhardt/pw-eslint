import { SyntaxKind } from 'ts-morph';
import picomatch from 'picomatch';
import { relative } from 'node:path';
import type { RuleDefinition } from '../domain/rule.js';

export const r13NoAssertionInPageObject: RuleDefinition = {
  apiVersion: 1,
  id: 'no-assertion-in-page-object',
  description: 'Disallows expect() calls inside page objects; assertions belong in spec files.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'correctness',
  explain: {
    rationale:
      'Page objects model UI structure and interactions. ' +
      'Embedding expect() assertions violates Single Responsibility Principle, ' +
      'making page objects harder to reuse across different test scenarios.',
    examples: [
      `// ❌ Assertion in page object\nexport class LoginPage {\n  async assertVisible() {\n    await expect(this.submitBtn).toBeVisible(); // belongs in spec\n  }\n}`,
    ],
    fixGuidance:
      'Move expect() calls to the spec file. Page objects should return data or perform actions; specs should assert.',
  },

  check(context) {
    const { sourceFile, config } = context;
    const filePath = sourceFile.getFilePath();

    const relPath = relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (!picomatch.isMatch(relPath, config.pageObjectPattern)) return;

    sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpr) => {
      const callee = callExpr.getExpression();

      if (callee.getKind() === SyntaxKind.Identifier) {
        if (callee.asKindOrThrow(SyntaxKind.Identifier).getText() === 'expect') {
          context.report(
            callExpr,
            'expect() in page object violates SRP; move assertions to the spec file'
          );
        }
      } else if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        const base = callee.asKindOrThrow(SyntaxKind.PropertyAccessExpression).getExpression();
        if (
          base.getKind() === SyntaxKind.Identifier &&
          base.asKindOrThrow(SyntaxKind.Identifier).getText() === 'expect'
        ) {
          context.report(
            callExpr,
            'expect() in page object violates SRP; move assertions to the spec file'
          );
        }
      }
    });
  },
};
