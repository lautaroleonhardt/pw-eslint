import chalk from 'chalk';
import type { Finding } from '../domain/finding.js';
import type { DiffReport } from '../domain/diff.js';

// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string): string => s.replace(/\x1B\[[0-9;]*m/g, '');

function formatTable(headers: string[], rows: string[][]): string {
  const all = [headers, ...rows];
  const widths = headers.map((_, i) => Math.max(...all.map((r) => stripAnsi(r[i] ?? '').length)));
  const pad = (s: string, w: number) => s + ' '.repeat(w - stripAnsi(s).length);
  const hr = (l: string, m: string, r: string) =>
    l + widths.map((w) => '─'.repeat(w + 2)).join(m) + r;
  const fmtRow = (cells: string[]) =>
    '│ ' + cells.map((c, i) => pad(c, widths[i] ?? 0)).join(' │ ') + ' │';
  return [
    hr('┌', '┬', '┐'),
    fmtRow(headers),
    hr('├', '┼', '┤'),
    ...rows.map(fmtRow),
    hr('└', '┴', '┘'),
  ].join('\n');
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

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => (a.line !== b.line ? a.line - b.line : a.column - b.column));
}

function formatSeverity(severity: Finding['severity']): string {
  return severity === 'error' ? chalk.red('error') : chalk.yellow('warn ');
}

export function formatPretty(
  findings: Finding[],
  noColor = false,
  diff?: DiffReport,
  allRuleIds: string[] = []
): string {
  if (noColor) chalk.level = 0;

  const lines: string[] = [];
  const grouped = groupByFile(findings);

  for (const [filePath, fileFindings] of grouped) {
    lines.push('');
    lines.push(chalk.bold.underline(filePath));

    for (const f of sortFindings(fileFindings)) {
      const loc = chalk.dim(`${f.line}:${f.column}`);
      const sev = formatSeverity(f.severity);
      const rule = chalk.cyan(f.ruleId.padEnd(22));
      lines.push(`  ${loc}  ${sev}  ${rule}  ${f.message}`);
      if (f.suggestion) {
        lines.push(`  ${' '.repeat(6)}  ${chalk.dim('Suggestion:')} ${f.suggestion}`);
      }
    }
  }

  if (allRuleIds.length > 0) {
    lines.push('');
    lines.push(buildSummaryTable(findings, allRuleIds));
  }

  lines.push('');
  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warnCount = findings.filter((f) => f.severity === 'warn').length;

  if (findings.length === 0) {
    lines.push(chalk.green('✓ No findings.'));
  } else {
    const parts: string[] = [];
    if (errorCount > 0) parts.push(chalk.red(`${errorCount} error${errorCount !== 1 ? 's' : ''}`));
    if (warnCount > 0)
      parts.push(chalk.yellow(`${warnCount} warning${warnCount !== 1 ? 's' : ''}`));
    lines.push(parts.join(', '));
  }

  if (diff) {
    lines.push('');
    lines.push(chalk.bold('Comparison to baseline:'));
    lines.push(buildDiffTable(diff, noColor));
  }

  return lines.join('\n');
}

function buildDiffTable(diff: DiffReport, noColor: boolean): string {
  if (noColor) chalk.level = 0;
  const { baseline, current, delta } = diff.summary;
  const fmtDelta = (n: number): string => {
    if (n > 0) return chalk.red(`+${n}`);
    if (n < 0) return chalk.green(String(n));
    return chalk.dim('0');
  };
  return formatTable(
    [chalk.bold('Category'), chalk.bold('Baseline'), chalk.bold('Current'), chalk.bold('Delta')],
    [
      ['Errors', String(baseline.errors), String(current.errors), fmtDelta(delta.errors)],
      ['Warnings', String(baseline.warnings), String(current.warnings), fmtDelta(delta.warnings)],
      ['Fixed', '-', String(diff.fixed.length), chalk.green(String(diff.fixed.length))],
      [
        'New',
        '-',
        String(diff.new.length),
        diff.new.length > 0 ? chalk.red(String(diff.new.length)) : chalk.dim('0'),
      ],
    ]
  );
}

function buildSummaryTable(findings: Finding[], allRuleIds: string[]): string {
  const ruleIds = [...new Set([...allRuleIds, ...findings.map((f) => f.ruleId)])].sort();
  return formatTable(
    [chalk.bold('Rule'), chalk.bold('Errors'), chalk.bold('Warnings')],
    ruleIds.map((ruleId) => {
      const rf = findings.filter((f) => f.ruleId === ruleId);
      const errors = rf.filter((f) => f.severity === 'error').length;
      const warns = rf.filter((f) => f.severity === 'warn').length;
      return [
        ruleId,
        errors > 0 ? chalk.red(String(errors)) : chalk.dim('0'),
        warns > 0 ? chalk.yellow(String(warns)) : chalk.dim('0'),
      ];
    })
  );
}
