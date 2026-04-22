import { resolve } from 'node:path';
import { glob } from 'tinyglobby';
import type { ResolvedConfig } from '../domain/config.js';
import { defaultFS, type FileSystem } from '../infrastructure/fs.js';

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`Path not found: ${path}`);
    this.name = 'FileNotFoundError';
  }
}

export async function discoverFiles(
  targetPath: string,
  config: ResolvedConfig,
  fs: FileSystem = defaultFS
): Promise<string[]> {
  const absPath = resolve(targetPath);

  if (!fs.exists(absPath)) {
    throw new FileNotFoundError(absPath);
  }

  const stat = fs.stat(absPath);

  if (stat.isFile()) {
    return [absPath];
  }

  const entries = await glob(config.include, {
    cwd: absPath,
    ignore: config.exclude,
    absolute: true,
    onlyFiles: true,
  });

  return entries;
}
