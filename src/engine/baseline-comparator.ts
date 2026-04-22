import type { Finding } from '../domain/finding.js';
import type { DiffReport, DiffSummary } from '../domain/diff.js';

function toKey(f: Finding): string {
  return `${f.filePath}:${f.line}:${f.column}:${f.ruleId}`;
}

function buildSummary(baseline: Finding[], current: Finding[]): DiffSummary {
  const baselineErrors = baseline.filter((f) => f.severity === 'error').length;
  const baselineWarnings = baseline.filter((f) => f.severity === 'warn').length;
  const currentErrors = current.filter((f) => f.severity === 'error').length;
  const currentWarnings = current.filter((f) => f.severity === 'warn').length;
  return {
    baseline: { errors: baselineErrors, warnings: baselineWarnings },
    current: { errors: currentErrors, warnings: currentWarnings },
    delta: { errors: currentErrors - baselineErrors, warnings: currentWarnings - baselineWarnings },
  };
}

export function compareFindings(baseline: Finding[], current: Finding[]): DiffReport {
  const baselineKeys = new Map(baseline.map((f) => [toKey(f), f]));
  const currentKeys = new Map(current.map((f) => [toKey(f), f]));

  const newFindings = current.filter((f) => !baselineKeys.has(toKey(f)));
  const fixedFindings = baseline.filter((f) => !currentKeys.has(toKey(f)));
  const unchangedFindings = current.filter((f) => baselineKeys.has(toKey(f)));

  return {
    new: newFindings,
    fixed: fixedFindings,
    unchanged: unchangedFindings,
    summary: buildSummary(baseline, current),
  };
}
