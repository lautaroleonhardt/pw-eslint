import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, lstatSync, realpathSync, type Stats } from 'node:fs';

/**
 * Abstract interface for filesystem operations.
 * Allows for dependency injection and mocking in tests.
 */
export interface FileSystem {
  exists(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, content: string): void;
  mkdir(path: string, options?: { recursive?: boolean }): void;
  stat(path: string): Stats;
  lstat(path: string): Stats;
  /**
   * Returns names of entries in the directory (not full paths).
   */
  readdir(path: string): string[];
  realpath(path: string): string;
}

/**
 * Default implementation of FileSystem using node:fs.
 */
export class NodeFileSystem implements FileSystem {
  exists(path: string): boolean {
    return existsSync(path);
  }

  readFile(path: string): string {
    return readFileSync(path, 'utf-8');
  }

  writeFile(path: string, content: string): void {
    writeFileSync(path, content, 'utf-8');
  }

  mkdir(path: string, options?: { recursive?: boolean }): void {
    mkdirSync(path, options);
  }

  stat(path: string): Stats {
    return statSync(path);
  }

  lstat(path: string): Stats {
    return lstatSync(path);
  }

  readdir(path: string): string[] {
    return readdirSync(path);
  }

  realpath(path: string): string {
    return realpathSync(path);
  }
}

/**
 * Global default instance of FileSystem.
 */
export const defaultFS = new NodeFileSystem();
