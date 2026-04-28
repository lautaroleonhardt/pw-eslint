import { Project, ScriptTarget, type FileSystemHost, type RuntimeDirEntry } from 'ts-morph';
import { dirname, join, relative, resolve } from 'node:path';
import picomatch from 'picomatch';
import { defaultFS, type FileSystem, NodeFileSystem } from '../infrastructure/fs.js';

function findTsConfig(startDir: string, fs: FileSystem): string | undefined {
  let dir = startDir;
  while (true) {
    const candidate = join(dir, 'tsconfig.json');
    if (fs.exists(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined; // filesystem root
    dir = parent;
  }
}

/**
 * Adapter to use our FileSystem interface as a ts-morph FileSystemHost.
 */
class TsMorphFsAdapter implements FileSystemHost {
  constructor(private readonly fs: FileSystem) {}

  exists(path: string): boolean {
    return this.fs.exists(path);
  }

  delete(_path: string): Promise<void> {
    throw new Error('Delete not supported');
  }

  deleteSync(_path: string): void {
    throw new Error('Delete not supported');
  }

  readDirSync(dirPath: string): RuntimeDirEntry[] {
    try {
      return this.fs.readdir(dirPath).map((name) => {
        const fullPath = join(dirPath, name);
        const lstat = this.fs.lstat(fullPath);
        const isSymlink = lstat.isSymbolicLink();
        const stat = isSymlink ? this.fs.stat(fullPath) : lstat;
        return {
          name: fullPath,
          isFile: stat.isFile(),
          isDirectory: stat.isDirectory(),
          isSymlink,
        };
      });
    } catch {
      return [];
    }
  }

  readFileSync(filePath: string, _encoding?: string): string {
    return this.fs.readFile(filePath);
  }

  readFile(filePath: string, _encoding?: string): Promise<string> {
    return Promise.resolve(this.fs.readFile(filePath));
  }

  writeFileSync(filePath: string, fileText: string): void {
    this.fs.writeFile(filePath, fileText);
  }

  writeFile(filePath: string, fileText: string): Promise<void> {
    this.fs.writeFile(filePath, fileText);
    return Promise.resolve();
  }

  mkdirSync(dirPath: string): void {
    this.fs.mkdir(dirPath, { recursive: true });
  }

  mkdir(dirPath: string): Promise<void> {
    this.fs.mkdir(dirPath, { recursive: true });
    return Promise.resolve();
  }

  move(_srcPath: string, _destPath: string): Promise<void> {
    throw new Error('Move not supported');
  }

  moveSync(_srcPath: string, _destPath: string): void {
    throw new Error('Move not supported');
  }

  copy(_srcPath: string, _destPath: string): Promise<void> {
    throw new Error('Copy not supported');
  }

  copySync(_srcPath: string, _destPath: string): void {
    throw new Error('Copy not supported');
  }

  fileExists(filePath: string): Promise<boolean> {
    return Promise.resolve(this.fs.exists(filePath));
  }

  fileExistsSync(filePath: string): boolean {
    return this.fs.exists(filePath);
  }

  directoryExists(dirPath: string): Promise<boolean> {
    try {
      return Promise.resolve(this.fs.exists(dirPath) && this.fs.stat(dirPath).isDirectory());
    } catch {
      return Promise.resolve(false);
    }
  }

  directoryExistsSync(dirPath: string): boolean {
    try {
      return this.fs.exists(dirPath) && this.fs.stat(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  realpathSync(path: string): string {
    try {
      return this.fs.realpath(path);
    } catch {
      return path;
    }
  }

  getCurrentDirectory(): string {
    return resolve('.');
  }

  isCaseSensitive(): boolean {
    return process.platform !== 'win32';
  }

  glob(patterns: readonly string[]): Promise<string[]> {
    return Promise.resolve(this.globSync(patterns));
  }

  globSync(patterns: readonly string[]): string[] {
    const cwd = this.getCurrentDirectory();
    const positive = (patterns as string[]).filter((p) => !p.startsWith('!'));
    const negative = (patterns as string[]).filter((p) => p.startsWith('!')).map((p) => p.slice(1));
    const isMatch = picomatch(positive);
    const isNegated = negative.length > 0 ? picomatch(negative) : () => false;

    const results: string[] = [];
    const walk = (dir: string): void => {
      let entries: string[];
      try {
        entries = this.fs.readdir(dir);
      } catch {
        return;
      }
      for (const name of entries) {
        const fullPath = join(dir, name);
        try {
          const stat = this.fs.stat(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (stat.isFile()) {
            const rel = relative(cwd, fullPath);
            if (isMatch(rel) && !isNegated(rel)) results.push(fullPath);
          }
        } catch {
          /* skip unreadable entries */
        }
      }
    };
    walk(cwd);
    return results;
  }
}

export function createProject(targetDir: string, fs: FileSystem = defaultFS): Project {
  const tsConfigFilePath = findTsConfig(targetDir, fs);
  // Use default ts-morph FS host if using NodeFileSystem to avoid subtle adapter bugs
  // especially with path standardization which ts-morph is very sensitive about.
  const fileSystem = fs instanceof NodeFileSystem ? undefined : new TsMorphFsAdapter(fs);

  if (tsConfigFilePath) {
    return new Project({
      tsConfigFilePath,
      skipAddingFilesFromTsConfig: true,
      fileSystem,
    });
  }

  // Synthesize minimal project config for repos without tsconfig.json
  return new Project({
    compilerOptions: {
      target: ScriptTarget.ES2022,
      allowJs: true,
      strict: false,
    },
    skipAddingFilesFromTsConfig: true,
    fileSystem,
  });
}
