export type Severity = 'error' | 'warn';
export type FixStatus = 'fixed' | 'fix-skipped' | 'parse-error';

export interface Finding {
  ruleId: string;
  severity: Severity;
  filePath: string;
  line: number; // 1-based
  column: number; // 1-based
  message: string;
  suggestion?: string;
  fixable: boolean;
  fixStatus?: FixStatus;
}
