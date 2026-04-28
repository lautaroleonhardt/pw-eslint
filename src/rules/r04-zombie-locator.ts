import { SyntaxKind } from 'ts-morph';
import picomatch from 'picomatch';
import type { RuleDefinition } from '../domain/rule.js';

export const r04ZombieLocator: RuleDefinition = {
  apiVersion: 1,
  id: 'zombie-locator',
  description: 'Flags Page Object properties never referenced in any spec file.',
  defaultSeverity: 'warn',
  fixable: false,
  category: 'flakiness',
  explain: {
    rationale:
      'Page Object properties that are defined but never used in specs are dead code. ' +
      'They add maintenance burden and can mask stale selectors that would break silently if the app changes.',
    examples: [
      `// ❌ Page Object with unused locator\nclass LoginPage {\n  readonly submitBtn = this.page.locator('#submit');\n  readonly forgotPasswordLink = this.page.locator('.forgot'); // never used in specs\n}`,
    ],
    fixGuidance:
      'Remove the unreferenced property from the Page Object, or add tests that use it. ' +
      'If the property is intentionally kept (e.g., future use), suppress with:\n' +
      '  // pw-eslint-disable-next-line zombie-locator',
  },

  check(context) {
    const { sourceFile, project, config } = context;
    const filePath = sourceFile.getFilePath();

    // Only run on files matching pageObjectPattern
    if (!picomatch.isMatch(filePath, config.pageObjectPattern)) return;

    // Find Page Object classes: class whose constructor has a param named/typed Page
    const classes = sourceFile.getClasses();

    for (const cls of classes) {
      const ctor = cls.getConstructors()[0];
      if (!ctor) continue;

      const isPageObject = ctor.getParameters().some((p) => {
        const name = p.getName();
        const typeText = p.getTypeNode()?.getText() ?? '';
        return name === 'page' || typeText === 'Page';
      });

      if (!isPageObject) continue;

      // Collect locator property names from PropertyDeclaration nodes
      const propertyNodes = new Map<string, { node: import('ts-morph').Node; name: string }>();

      for (const prop of cls.getProperties()) {
        const name = prop.getName();
        propertyNodes.set(name, { node: prop, name });
      }

      // Collect this.X = ... assignments in constructor body
      const ctorBody = ctor.getBody();
      if (ctorBody) {
        ctorBody.getDescendantsOfKind(SyntaxKind.ExpressionStatement).forEach((stmt) => {
          const expr = stmt.getExpression();
          if (expr.getKind() !== SyntaxKind.BinaryExpression) return;

          const bin = expr.asKindOrThrow(SyntaxKind.BinaryExpression);
          const left = bin.getLeft();
          if (left.getKind() !== SyntaxKind.PropertyAccessExpression) return;

          const propAccess = left.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
          const obj = propAccess.getExpression();
          if (obj.getKind() !== SyntaxKind.ThisKeyword) return;

          const name = propAccess.getName();
          // Don't override PropertyDeclaration nodes; only add if not already tracked
          if (!propertyNodes.has(name)) {
            propertyNodes.set(name, { node: propAccess, name });
          }
        });
      }

      if (propertyNodes.size === 0) continue;

      // Collect all spec file texts for whole-word token search
      const specFiles = project
        .getSourceFiles()
        .filter((sf) => picomatch.isMatch(sf.getFilePath(), config.specPattern));

      const specTexts = specFiles.map((sf) => sf.getFullText());

      for (const { node, name } of propertyNodes.values()) {
        const pattern = new RegExp(`\\b${escapeRegex(name)}\\b`);
        const isReferenced = specTexts.some((text) => pattern.test(text));

        if (!isReferenced) {
          context.report(
            node,
            `Zombie locator: "${name}" is never referenced in any spec file.`,
            `Remove or use this locator in a test. If intentional, consider renaming to clarify purpose.`
          );
        }
      }
    }
  },
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
