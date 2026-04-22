import { formatPretty } from './pretty.js';
import type { Finding } from '../domain/finding.js';

export interface Formatter {
  format(findings: Finding[], noColor?: boolean): string;
}

export function getFormatter(_format: string): Formatter {
  return { format: (findings, noColor) => formatPretty(findings, noColor) };
}
