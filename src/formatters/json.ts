import type { Finding } from '../domain/finding.js';
import type { DiffReport } from '../domain/diff.js';

export function formatJson(findings: Finding[], diff?: DiffReport): string {
  if (diff) {
    return JSON.stringify(
      {
        findings,
        diff: { new: diff.new, fixed: diff.fixed, unchanged: diff.unchanged },
        summary: diff.summary,
      },
      null,
      2
    );
  }
  return JSON.stringify(findings, null, 2);
}
