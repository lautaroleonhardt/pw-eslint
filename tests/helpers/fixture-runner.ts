import { Project, ScriptTarget } from 'ts-morph';
import type { Finding } from '../../src/domain/finding.js';
import type { RuleDefinition } from '../../src/domain/rule.js';
import type { ResolvedConfig } from '../../src/domain/config.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';
import { RuleRunner } from '../../src/engine/runner.js';

function makeProject(): Project {
  return new Project({
    compilerOptions: {
      target: ScriptTarget.ES2022,
      allowJs: true,
      strict: false,
    },
    skipAddingFilesFromTsConfig: true,
  });
}

export function runRuleOnFixture(
  rule: RuleDefinition,
  fixturePath: string,
  configOverride: Partial<ResolvedConfig> = {}
): Finding[] {
  const project = makeProject();
  project.addSourceFileAtPath(fixturePath);

  const config: ResolvedConfig = { ...DEFAULT_CONFIG, ...configOverride };
  const runner = new RuleRunner([rule], config, 'none');
  return runner.run([fixturePath], project).findings;
}

export function runFixOnFixture(
  rule: RuleDefinition,
  fixturePath: string,
  additionalFilePaths: string[] = [],
  configOverride: Partial<ResolvedConfig> = {}
): { text: string; findings: Finding[] } {
  const project = makeProject();
  project.addSourceFileAtPath(fixturePath);
  for (const p of additionalFilePaths) {
    project.addSourceFileAtPath(p);
  }

  const config: ResolvedConfig = { ...DEFAULT_CONFIG, ...configOverride };
  // Use 'dry-run' so fixes are applied in-memory but NOT written to disk
  const runner = new RuleRunner([rule], config, 'dry-run');
  const result = runner.run([fixturePath], project);
  const sourceFile = project.getSourceFileOrThrow(fixturePath);
  return { text: sourceFile.getFullText(), findings: result.findings };
}

export function runRulesOnFixtures(
  rules: RuleDefinition[],
  filePaths: string[],
  configOverride: Partial<ResolvedConfig> = {}
): Finding[] {
  const project = makeProject();
  for (const p of filePaths) {
    project.addSourceFileAtPath(p);
  }

  const config: ResolvedConfig = { ...DEFAULT_CONFIG, ...configOverride };
  const runner = new RuleRunner(rules, config, 'none');
  return runner.run(filePaths, project).findings;
}
