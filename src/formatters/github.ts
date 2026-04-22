import type { Finding } from '../domain/finding.js';

// GitHub Actions annotation format requires escaping of specific characters in message text.
// Spec: docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
function escapeAnnotationData(text: string): string {
  return text
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

export function formatGithub(findings: Finding[]): string {
  if (findings.length === 0) return '';

  return findings
    .map((f) => {
      const level = f.severity === 'error' ? 'error' : 'warning';
      const message = escapeAnnotationData(`${f.ruleId}: ${f.message}`);
      return `::${level} file=${f.filePath},line=${f.line},col=${f.column}::${message}`;
    })
    .join('\n');
}
