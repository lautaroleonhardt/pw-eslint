import type { Finding } from '../domain/finding.js';
import { defaultFS, type FileSystem } from './fs.js';

export class BaselineLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaselineLoadError';
  }
}

export function loadBaseline(filePath: string, fs: FileSystem = defaultFS): Finding[] {
  if (!fs.exists(filePath)) {
    throw new BaselineLoadError(`Baseline file not found: "${filePath}"`);
  }

  let parsed: unknown;
  try {
    const text = fs.readFile(filePath);
    parsed = JSON.parse(text);
  } catch (err) {
    throw new BaselineLoadError(
      `Failed to parse baseline file "${filePath}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!Array.isArray(parsed)) {
    throw new BaselineLoadError(
      `Baseline file "${filePath}" must contain a JSON array of findings.`
    );
  }

  for (const item of parsed as unknown[]) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new BaselineLoadError(
        `Baseline file "${filePath}" contains invalid entries — expected objects.`
      );
    }
  }

  return parsed as Finding[];
}
