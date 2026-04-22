import { formatPretty } from './pretty.js';
import { formatJson } from './json.js';
import { formatJunit } from './junit.js';
import { formatGithub } from './github.js';
import type { Finding } from '../domain/finding.js';
import type { DiffReport } from '../domain/diff.js';

export interface Formatter {
  format(findings: Finding[], noColor?: boolean, diff?: DiffReport): string;
}

export function getFormatter(format: 'pretty' | 'json' | 'junit' | 'github'): Formatter {
  if (format === 'json') {
    return { format: (findings, _noColor, diff) => formatJson(findings, diff) };
  }
  if (format === 'junit') {
    return { format: (findings) => formatJunit(findings) };
  }
  if (format === 'github') {
    return { format: (findings) => formatGithub(findings) };
  }
  return {
    format: (findings, noColor, diff) => formatPretty(findings, noColor, diff),
  };
}
