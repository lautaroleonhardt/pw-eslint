import picomatch from 'picomatch';
import type { Project, SourceFile } from 'ts-morph';
import type { Finding, Severity } from '../domain/finding.js';
import type { RuleContext, FixContext } from '../domain/rule.js';
import type { RuleDefinition } from '../domain/rule.js';
import type { ResolvedConfig } from '../domain/config.js';

export type FixMode = 'none' | 'fix' | 'dry-run';

export interface RunResult {
  findings: Finding[];
  diffs: string[];
}

function buildUnifiedDiff(filePath: string, originalText: string, newText: string): string {
  const originalLines = originalText.split('\n');
  const newLines = newText.split('\n');

  const lines: string[] = [`--- a/${filePath}`, `+++ b/${filePath}`];

  // Simple hunk-based diff: find changed line ranges
  const maxLen = Math.max(originalLines.length, newLines.length);
  let i = 0;
  while (i < maxLen) {
    if (originalLines[i] !== newLines[i]) {
      const hunkStart = i;
      // Collect all changed lines in this hunk
      while (i < maxLen && originalLines[i] !== newLines[i]) {
        i++;
      }
      const hunkEnd = i;
      const origCount = hunkEnd - hunkStart;
      const newCount = hunkEnd - hunkStart;
      lines.push(`@@ -${hunkStart + 1},${origCount} +${hunkStart + 1},${newCount} @@`);
      for (let j = hunkStart; j < hunkEnd; j++) {
        if (j < originalLines.length) lines.push(`-${originalLines[j]!}`);
        if (j < newLines.length) lines.push(`+${newLines[j]!}`);
      }
    } else {
      i++;
    }
  }

  return lines.join('\n');
}

function parseDisableComments(text: string): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  const lines = text.split('\n');
  const pattern = /\/\/\s*pw-eslint-disable-next-line\s+([^\n]+)/i;

  lines.forEach((line, idx) => {
    const m = pattern.exec(line);
    if (!m) return;
    const ruleIds = m[1]!.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    // idx is 0-based. ts-morph getLineAndColumnAtPos returns 1-indexed line numbers,
    // and the runner stores findings as pos.line + 1. So the disable for the next line
    // must match: targetLine = (idx + 1) [next visual line, 1-indexed] + 1 [runner offset] + 1 [ts-morph 1-indexed] = idx + 3.
    const targetLine = idx + 3;
    const existing = map.get(targetLine);
    if (existing) {
      ruleIds.forEach((id) => existing.add(id));
    } else {
      map.set(targetLine, new Set(ruleIds));
    }
  });

  return map;
}

function resolveEffectiveSeverity(
  filePath: string,
  ruleId: string,
  config: ResolvedConfig,
): Severity | 'off' | undefined {
  for (const override of config.overrides ?? []) {
    if (picomatch.isMatch(filePath, override.files)) {
      if (ruleId in override.rules) {
        return override.rules[ruleId];
      }
    }
  }
  const entry = config.rules[ruleId];
  if (entry === undefined) return undefined;
  return Array.isArray(entry) ? entry[0] : (entry as Severity | 'off');
}

export class RuleRunner {
  constructor(
    private readonly rules: RuleDefinition[],
    private readonly config: ResolvedConfig,
    private readonly fixMode: FixMode = 'none',
  ) {}

  run(filePaths: string[], project: Project): RunResult {
    const allFindings: Finding[] = [];
    const diffs: string[] = [];

    for (const filePath of filePaths) {
      let sourceFile: SourceFile;
      try {
        sourceFile =
          project.getSourceFile(filePath) ??
          project.addSourceFileAtPath(filePath);
      } catch (err) {
        process.stderr.write(
          `[pw-eslint] parse-error: could not load ${filePath}: ${err}\n`,
        );
        continue;
      }

      const fullText = sourceFile.getFullText();
      const originalText = this.fixMode !== 'none' ? fullText : '';
      const disableMap = parseDisableComments(fullText);

      // Warn for unknown rule IDs in disable comments
      const knownRuleIds = new Set(this.rules.map((r) => r.id.toLowerCase()));
      for (const ruleIds of disableMap.values()) {
        for (const ruleId of ruleIds) {
          if (!knownRuleIds.has(ruleId)) {
            process.stderr.write(
              `[pw-eslint] Unknown rule ID in disable comment: "${ruleId}" (in ${filePath})\n`,
            );
          }
        }
      }

      // Track modified node positions to detect fix conflicts (per file, across all rules)
      const modifiedPositions = new Set<number>();

      for (const rule of this.rules) {
        const effectiveSeverity = resolveEffectiveSeverity(filePath, rule.id, this.config);
        if (effectiveSeverity === undefined || effectiveSeverity === 'off') continue;

        const severity: Severity = effectiveSeverity;

        const fileFindings: Finding[] = [];

        const context: RuleContext = {
          sourceFile,
          project,
          config: this.config,
          report(node, message, suggestion) {
            const pos = sourceFile.getLineAndColumnAtPos(node.getStart());
            const line = pos.line + 1;

            // Check if this violation is suppressed by an inline disable comment
            const disabled = disableMap.get(line);
            if (disabled?.has(rule.id.toLowerCase())) return;

            fileFindings.push({
              ruleId: rule.id,
              severity,
              filePath,
              line,
              column: pos.column + 1,
              message,
              suggestion,
              fixable: rule.fixable,
            });
          },
        };

        try {
          rule.check(context);
        } catch (err) {
          process.stderr.write(
            `[pw-eslint] Rule ${rule.id} threw on ${filePath}: ${err}\n`,
          );
        }

        // Apply fixes if requested and rule supports it
        if (this.fixMode !== 'none' && rule.fixable && rule.fix) {
          // Sort findings by node position descending (right-to-left) to avoid offset drift
          const sortedFindings = [...fileFindings].sort((a, b) => b.line - a.line || b.column - a.column);

          for (const finding of sortedFindings) {
            // Re-locate the node at the recorded position; use line/col as proxy key
            const nodeKey = finding.line * 100000 + finding.column;

            if (modifiedPositions.has(nodeKey)) {
              finding.fixStatus = 'fix-skipped';
              continue;
            }

            const fixContext: FixContext = {
              ...context,
              findings: [finding],
            };

            try {
              rule.fix(fixContext);
              modifiedPositions.add(nodeKey);
              finding.fixStatus = 'fixed';
            } catch (err) {
              process.stderr.write(
                `[pw-eslint] Fix for ${rule.id} failed on ${filePath}: ${err}\n`,
              );
              finding.fixStatus = 'fix-skipped';
            }
          }
        }

        allFindings.push(...fileFindings);
      }

      // After all rules processed for this file, save or diff
      if (this.fixMode !== 'none') {
        const newText = sourceFile.getFullText();
        if (newText !== originalText) {
          if (this.fixMode === 'fix') {
            sourceFile.saveSync();
          } else {
            // dry-run: build diff
            const diff = buildUnifiedDiff(filePath, originalText, newText);
            diffs.push(diff);
          }
        }
      }
    }

    return { findings: allFindings, diffs };
  }
}
