import type { RuleDefinition } from '../domain/rule.js';

export interface ExplainOptions {
  color?: boolean;
}

function bold(text: string, useColor: boolean): string {
  return useColor ? `\x1b[1m${text}\x1b[0m` : text;
}

function cyan(text: string, useColor: boolean): string {
  return useColor ? `\x1b[36m${text}\x1b[0m` : text;
}

function yellow(text: string, useColor: boolean): string {
  return useColor ? `\x1b[33m${text}\x1b[0m` : text;
}

function dim(text: string, useColor: boolean): string {
  return useColor ? `\x1b[2m${text}\x1b[0m` : text;
}

function formatSingleRule(rule: RuleDefinition, useColor: boolean): string {
  const lines: string[] = [];

  lines.push(bold(`Rule: ${rule.id}`, useColor));
  lines.push(`  Category:  ${rule.category ?? 'uncategorized'}`);
  lines.push(`  Severity:  ${rule.defaultSeverity}`);
  lines.push(`  Fixable:   ${rule.fixable ? 'yes (--fix supported)' : 'no'}`);
  lines.push('');
  lines.push(bold('Description', useColor));
  lines.push(`  ${rule.description}`);

  if (rule.explain) {
    lines.push('');
    lines.push(bold('Rationale', useColor));
    rule.explain.rationale.split('\n').forEach((l) => lines.push(`  ${l}`));

    if (rule.explain.examples.length > 0) {
      lines.push('');
      lines.push(bold('Examples', useColor));
      rule.explain.examples.forEach((ex, i) => {
        lines.push(dim(`  --- Example ${i + 1} ---`, useColor));
        ex.split('\n').forEach((l) => lines.push(cyan(`  ${l}`, useColor)));
      });
    }

    lines.push('');
    lines.push(bold('Fix Guidance', useColor));
    rule.explain.fixGuidance.split('\n').forEach((l) => lines.push(`  ${l}`));

    if (rule.explain.docsLink) {
      lines.push('');
      lines.push(`  Docs: ${rule.explain.docsLink}`);
    }
  }

  return lines.join('\n');
}

const COL_WIDTHS = { id: 28, category: 14, severity: 9 };

function formatRuleList(rules: RuleDefinition[], useColor: boolean): string {
  const lines: string[] = [];

  const header =
    bold('Rule ID'.padEnd(COL_WIDTHS.id), useColor) +
    bold('Category'.padEnd(COL_WIDTHS.category), useColor) +
    bold('Sev'.padEnd(COL_WIDTHS.severity), useColor) +
    bold('Description', useColor);

  const separator = '-'.repeat(COL_WIDTHS.id + COL_WIDTHS.category + COL_WIDTHS.severity + 40);

  lines.push(header);
  lines.push(dim(separator, useColor));

  for (const rule of rules) {
    const category = rule.category ?? 'uncategorized';
    const id = yellow(rule.id.padEnd(COL_WIDTHS.id), useColor);
    const cat = category.padEnd(COL_WIDTHS.category);
    const sev = rule.defaultSeverity.padEnd(COL_WIDTHS.severity);
    const desc = rule.description.length > 60
      ? rule.description.slice(0, 57) + '...'
      : rule.description;
    lines.push(`${id}${cat}${sev}${desc}`);
  }

  return lines.join('\n');
}

export function runExplain(
  ruleIdOrList: string,
  allRules: RuleDefinition[],
  options: ExplainOptions = {},
): void {
  const useColor = options.color !== false;

  if (ruleIdOrList === '--list') {
    process.stdout.write(formatRuleList(allRules, useColor) + '\n');
    process.exit(0);
  }

  const rule = allRules.find((r) => r.id.toLowerCase() === ruleIdOrList.toLowerCase());
  if (!rule) {
    process.stderr.write(`[pw-eslint] Rule not found: "${ruleIdOrList}"\n`);
    process.exit(1);
  }

  process.stdout.write(formatSingleRule(rule, useColor) + '\n');
  process.exit(0);
}
