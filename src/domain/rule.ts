import type { Node, Project, SourceFile } from 'ts-morph';
import type { Finding } from './finding.js';
import type { ResolvedConfig } from './config.js';

export type RuleCategory = 'flakiness' | 'hygiene' | 'style' | 'correctness' | 'uncategorized';

export interface RuleExplainData {
  rationale: string;
  examples: string[];
  fixGuidance: string;
  docsLink?: string;
}

export interface RuleContext {
  sourceFile: SourceFile;
  project: Project;
  config: ResolvedConfig;
  report(node: Node, message: string, suggestion?: string): void;
}

export interface FixContext extends RuleContext {
  findings: Finding[];
}

export interface RuleDefinition {
  apiVersion: 1;
  id: string;
  description: string;
  defaultSeverity: 'error' | 'warn';
  fixable: boolean;
  category?: RuleCategory;
  explain?: RuleExplainData;
  check(context: RuleContext): void;
  fix?(context: FixContext): void;
}
