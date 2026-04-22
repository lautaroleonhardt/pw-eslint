import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { runRulesOnFixtures } from '../helpers/fixture-runner.js';
import { r04ZombieLocator } from '../../src/rules/r04-zombie-locator.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/r04');
const pageObjPath = `${fixtureDir}/login-page.ts`;
const specPath = `${fixtureDir}/login.spec.ts`;

describe('R04: zombie-locator', () => {
  it('fires on Page Object properties never referenced in spec files', () => {
    const findings = runRulesOnFixtures(
      [r04ZombieLocator],
      [pageObjPath, specPath],
      { pageObjectPattern: `${fixtureDir}/*-page.ts`, specPattern: `${fixtureDir}/*.spec.ts` },
    );

    const zombieIds = findings.map((f) => f.message);
    expect(findings.length).toBeGreaterThan(0);
    // zombieBtn is never referenced in spec
    expect(zombieIds.some((m) => m.includes('zombieBtn'))).toBe(true);
    // deadLocator is never referenced in spec
    expect(zombieIds.some((m) => m.includes('deadLocator'))).toBe(true);
  });

  it('does not fire on properties referenced in spec files', () => {
    const findings = runRulesOnFixtures(
      [r04ZombieLocator],
      [pageObjPath, specPath],
      { pageObjectPattern: `${fixtureDir}/*-page.ts`, specPattern: `${fixtureDir}/*.spec.ts` },
    );

    const zombieIds = findings.map((f) => f.message);
    // submitBtn IS referenced in spec
    expect(zombieIds.some((m) => m.includes('submitBtn'))).toBe(false);
    // activeLocator IS referenced in spec
    expect(zombieIds.some((m) => m.includes('activeLocator'))).toBe(false);
  });

  it('reports warn severity by default', () => {
    const findings = runRulesOnFixtures(
      [r04ZombieLocator],
      [pageObjPath, specPath],
      { pageObjectPattern: `${fixtureDir}/*-page.ts`, specPattern: `${fixtureDir}/*.spec.ts` },
    );
    expect(findings.every((f) => f.severity === 'warn')).toBe(true);
  });

  it('reports correct ruleId', () => {
    const findings = runRulesOnFixtures(
      [r04ZombieLocator],
      [pageObjPath, specPath],
      { pageObjectPattern: `${fixtureDir}/*-page.ts`, specPattern: `${fixtureDir}/*.spec.ts` },
    );
    expect(findings.every((f) => f.ruleId === 'zombie-locator')).toBe(true);
  });

  it('does not fire on non-page-object files', () => {
    // specPattern matches only spec files; runner should skip spec file for zombie check
    const findings = runRulesOnFixtures(
      [r04ZombieLocator],
      [specPath],
      { pageObjectPattern: `${fixtureDir}/*-page.ts`, specPattern: `${fixtureDir}/*.spec.ts` },
    );
    expect(findings).toHaveLength(0);
  });
});
