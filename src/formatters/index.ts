import { formatPretty } from './pretty.js';
import { formatJson } from './json.js';
import { formatJunit } from './junit.js';
import type { Finding } from '../domain/finding.js';

export interface Formatter {
  format(findings: Finding[], noColor?: boolean): string;
}

export function getFormatter(format: 'pretty' | 'json' | 'junit'): Formatter {
  if (format === 'json') {
    return { format: (findings) => formatJson(findings) };
  }
  if (format === 'junit') {
    return { format: (findings) => formatJunit(findings) };
  }
  return { format: (findings, noColor) => formatPretty(findings, noColor) };
}
