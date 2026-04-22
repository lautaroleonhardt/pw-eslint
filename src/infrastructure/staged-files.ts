import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

export class NotAGitRepoError extends Error {
  constructor() {
    super('Not in a git repository');
    this.name = 'NotAGitRepoError';
  }
}

export function getStagedFiles(cwd: string = process.cwd()): string[] {
  let stdout: string;
  try {
    stdout = execSync('git diff --name-only --cached', {
      encoding: 'utf-8',
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('not a git repository') || msg.includes('Not a git repository')) {
      throw new NotAGitRepoError();
    }
    throw new NotAGitRepoError();
  }

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => resolve(cwd, line));
}
