import { SyntaxKind } from 'ts-morph';
import picomatch from 'picomatch';
import { relative } from 'node:path';
import type { RuleDefinition } from '../domain/rule.js';

/**
 * Collect all node positions in the file where a variable named 'page' is declared,
 * to distinguish declaration nodes from usage nodes.
 */
function getPageDeclarationStarts(sourceFile: ReturnType<typeof import('ts-morph').Project.prototype.getSourceFile>): Set<number> {
  if (!sourceFile) return new Set();
  const starts = new Set<number>();

  // ParameterDeclaration with name 'page' (simple name)
  sourceFile.getDescendantsOfKind(SyntaxKind.Parameter).forEach((param) => {
    const nameNode = param.getNameNode();
    if (nameNode.getKind() === SyntaxKind.Identifier &&
        nameNode.asKindOrThrow(SyntaxKind.Identifier).getText() === 'page') {
      starts.add(param.getStart());
    }
  });

  // ObjectBindingPattern: find BindingElement named 'page' (Playwright fixture { page })
  sourceFile.getDescendantsOfKind(SyntaxKind.BindingElement).forEach((el) => {
    const nameNode = el.getNameNode();
    if (nameNode.getKind() === SyntaxKind.Identifier &&
        nameNode.asKindOrThrow(SyntaxKind.Identifier).getText() === 'page') {
      starts.add(el.getStart());
    }
  });

  // VariableDeclaration with name 'page'
  sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((decl) => {
    const nameNode = decl.getNameNode();
    if (nameNode.getKind() === SyntaxKind.Identifier &&
        nameNode.asKindOrThrow(SyntaxKind.Identifier).getText() === 'page') {
      starts.add(decl.getStart());
    }
  });

  return starts;
}

export const r06LeakyPageObject: RuleDefinition = {
  apiVersion: 1,
  id: 'leaky-page-object',
  description: 'Warns when spec files access the Playwright page object directly instead of via Page Objects.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'hygiene',
  explain: {
    rationale:
      'Direct page access in spec files bypasses the Page Object abstraction layer, ' +
      'causing implementation details to leak into tests. This makes tests harder to maintain: ' +
      'when the UI changes, every spec that directly uses page must be updated instead of just the Page Object.',
    examples: [
      `// ❌ Spec directly uses page — leaks Playwright API into test logic\ntest('login', async ({ page }) => {\n  await page.locator('#username').fill('user');\n  await page.locator('#password').fill('pass');\n});`,
      `// ✅ Spec delegates to Page Object\ntest('login', async ({ page }) => {\n  const loginPage = new LoginPage(page);\n  await loginPage.login('user', 'pass');\n});`,
    ],
    fixGuidance:
      'Encapsulate page interactions inside a Page Object class. ' +
      'Create a class that accepts page in its constructor and exposes high-level methods.',
  },

  check(context) {
    const { sourceFile, config } = context;
    const filePath = sourceFile.getFilePath();

    // Compute path relative to the project root (cwd) for glob matching
    const relPath = relative(process.cwd(), filePath).replace(/\\/g, '/');

    const isSpec = picomatch.isMatch(relPath, config.specPattern) ||
                   picomatch.isMatch(relPath, '**/*.spec.ts') ||
                   picomatch.isMatch(relPath, '**/*.spec.js');
    const isPageObject = picomatch.isMatch(relPath, config.pageObjectPattern);

    if (!isSpec || isPageObject) return;

    const declarationStarts = getPageDeclarationStarts(sourceFile);

    // Find all PropertyAccessExpressions where the object is an Identifier named 'page'
    sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach((prop) => {
      const obj = prop.getExpression();
      if (obj.getKind() !== SyntaxKind.Identifier) return;
      if (obj.asKindOrThrow(SyntaxKind.Identifier).getText() !== 'page') return;

      // Skip if this is inside a NewExpression argument list
      // (new HomePage(page) — page is an arg identifier, not a member access)
      // Note: this case is actually an Identifier, not a PropertyAccessExpression,
      // so it won't match here. But guard anyway for nested cases.
      let ancestor = prop.getParent();
      while (ancestor) {
        if (ancestor.getKind() === SyntaxKind.NewExpression) return;
        if (ancestor.getKind() === SyntaxKind.ExpressionStatement ||
            ancestor.getKind() === SyntaxKind.VariableDeclaration) break;
        ancestor = ancestor.getParent();
      }

      // Skip the declaration itself
      if (declarationStarts.has(prop.getStart())) return;

      context.report(
        prop,
        `Direct \`page\` access in spec file. Use a Page Object to encapsulate page interactions.`,
        `Create or use a Page Object class that accepts \`page\` in its constructor.`,
      );
    });
  },
};
