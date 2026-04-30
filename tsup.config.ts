import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'node:fs';

const NODE_BUILTINS = [
  'fs',
  'path',
  'child_process',
  'os',
  'crypto',
  'events',
  'http',
  'https',
  'net',
  'stream',
  'url',
  'util',
  'zlib',
];
const BUILTIN_RE = new RegExp(`from "(${NODE_BUILTINS.join('|')})"`, 'g');

function restoreNodePrefix(filePath: string): void {
  const content = readFileSync(filePath, 'utf8');
  const fixed = content.replace(BUILTIN_RE, (_: string, name: string) => `from "node:${name}"`);
  if (fixed !== content) writeFileSync(filePath, fixed, 'utf8');
}

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  onSuccess: (): Promise<void> => {
    // Inject shebang into CLI entry only
    const cliPath = 'dist/cli/index.js';
    const content = readFileSync(cliPath, 'utf8');
    if (!content.startsWith('#!')) {
      writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
    }

    // Restore node: prefix stripped by esbuild (Socket.dev flags bare specifiers)
    restoreNodePrefix('dist/index.js');
    restoreNodePrefix(cliPath);

    return Promise.resolve();
  },
});
