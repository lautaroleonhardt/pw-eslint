# Code Review Rules

## TypeScript
- Use const/let, never var
- Prefer strict mode with `noUncheckedIndexedAccess`
- Follow ESLint config in the project

## Testing
- Write tests in Vitest using helpers from `tests/helpers/fixture-runner.ts`
- Test fixable rules with both `.test.ts` and `-fix.test.ts`
- Use `.js` extensions in relative imports (NodeNext ESM)

## Commits
- Follow Conventional Commits (enforced by commitlint)
- No AI attribution or "Co-Authored-By" lines
