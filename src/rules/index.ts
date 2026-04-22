import { r01NoHardWait } from './r01-no-hard-wait.js';
import { r02DeepLocator } from './r02-deep-locator.js';
import { r03UnawaitedAction } from './r03-unawaited-action.js';
import { r05WebFirstAssertion } from './r05-web-first-assertion.js';
import { r06LeakyPageObject } from './r06-leaky-page-object.js';
import type { RuleDefinition } from '../domain/rule.js';

export const BUILT_IN_RULES: RuleDefinition[] = [
  r01NoHardWait,
  r02DeepLocator,
  r03UnawaitedAction,
  r05WebFirstAssertion,
  r06LeakyPageObject,
];
