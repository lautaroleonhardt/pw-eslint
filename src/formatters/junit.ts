import type { Finding } from '../domain/finding.js';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function groupByFile(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();
  for (const f of findings) {
    const existing = map.get(f.filePath);
    if (existing) {
      existing.push(f);
    } else {
      map.set(f.filePath, [f]);
    }
  }
  return map;
}

export function formatJunit(findings: Finding[]): string {
  const grouped = groupByFile(findings);
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<testsuites>'];

  for (const [filePath, fileFindings] of grouped) {
    const failureCount = fileFindings.filter((f) => f.severity === 'error').length;
    lines.push(
      `  <testsuite name="${escapeXml(filePath)}" tests="${fileFindings.length}" failures="${failureCount}">`
    );

    for (const f of fileFindings) {
      const name = escapeXml(`${f.ruleId} ${f.line}:${f.column}`);
      const classname = escapeXml(filePath);
      lines.push(`    <testcase name="${name}" classname="${classname}">`);

      if (f.severity === 'error' || f.severity === 'warn') {
        const msgAttr = escapeXml(f.message);
        const body = f.suggestion ? escapeXml(f.suggestion) : '';
        lines.push(
          `      <failure message="${msgAttr}" type="${escapeXml(f.ruleId)}">${body}</failure>`
        );
      }

      lines.push('    </testcase>');
    }

    lines.push('  </testsuite>');
  }

  lines.push('</testsuites>');
  return lines.join('\n');
}
