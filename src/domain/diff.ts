import type { Finding } from './finding.js';

export interface DiffSummary {
  baseline: { errors: number; warnings: number };
  current: { errors: number; warnings: number };
  delta: { errors: number; warnings: number };
}

export interface DiffReport {
  new: Finding[];
  fixed: Finding[];
  unchanged: Finding[];
  summary: DiffSummary;
}
