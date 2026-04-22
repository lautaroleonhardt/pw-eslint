import { r01NoHardWait } from './r01-no-hard-wait.js';
import { r02DeepLocator } from './r02-deep-locator.js';
import { r03UnawaitedAction } from './r03-unawaited-action.js';
import { r04ZombieLocator } from './r04-zombie-locator.js';
import { r05WebFirstAssertion } from './r05-web-first-assertion.js';
import { r06LeakyPageObject } from './r06-leaky-page-object.js';
import { r07NoPagePause } from './r07-no-page-pause.js';
import { r08NoFocusedTest } from './r08-no-focused-test.js';
import { r09NoHardcodedBaseUrl } from './r09-no-hardcoded-base-url.js';
import { r10NoHardcodedTimeout } from './r10-no-hardcoded-timeout.js';
import { r11NoConsoleInTest } from './r11-no-console-in-test.js';
import { r12NoSkippedTest } from './r12-no-skipped-test.js';
import { r13NoAssertionInPageObject } from './r13-no-assertion-in-page-object.js';
import { r14NoTestWithoutAssertion } from './r14-no-test-without-assertion.js';
import type { RuleDefinition } from '../domain/rule.js';

export const BUILT_IN_RULES: RuleDefinition[] = [
  r01NoHardWait,
  r02DeepLocator,
  r03UnawaitedAction,
  r04ZombieLocator,
  r05WebFirstAssertion,
  r06LeakyPageObject,
  r07NoPagePause,
  r08NoFocusedTest,
  r09NoHardcodedBaseUrl,
  r10NoHardcodedTimeout,
  r11NoConsoleInTest,
  r12NoSkippedTest,
  r13NoAssertionInPageObject,
  r14NoTestWithoutAssertion,
];
