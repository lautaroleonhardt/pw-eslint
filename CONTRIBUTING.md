# Contributing to pw-eslint

## Setup

```bash
git clone <repo-url>
cd pw-eslint
npm install
npm test
```

Requires Node.js ≥ 22.

## Development Workflow

```bash
npm test              # run all tests
npm run test:watch    # watch mode
npm run typecheck     # TypeScript type check
npm run build         # compile to dist/
npm run bench         # run performance benchmark (not part of test suite)
```

## Writing a Built-in Rule

1. Create `src/rules/rNN-your-rule-id.ts` following the pattern in `src/rules/r01-no-hard-wait.ts`.
2. Export a `const` satisfying `RuleDefinition` from `src/domain/rule.ts`.
3. Register it in `src/rules/index.ts`.
4. Add a default entry to `DEFAULT_CONFIG.rules` in `src/domain/config.ts`.
5. Write tests in `tests/unit/rNN.test.ts` using `runRuleOnFixture` from `tests/helpers/fixture-runner.ts`.
6. Follow TDD: write failing tests first, then implement.

## Testing Custom Rules (for contributors testing the plugin system)

Place `.js` fixture rules under `tests/fixtures/plugins/` and write tests in `tests/infrastructure/`.

## Pull Request Guidelines

- One logical change per PR.
- All tests must pass (`npm test`).
- No TypeScript errors (`npm run typecheck`).
- Follow existing code style — no linter config yet, just match surrounding code.
- Add or update tests for any behavior change.
- Keep commit messages descriptive.

## License

By contributing, you agree your contributions are licensed under the MIT License.
