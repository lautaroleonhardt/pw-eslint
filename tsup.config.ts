import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'node:fs';

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
  onSuccess: async () => {
    // Inject shebang into CLI entry only
    const cliPath = 'dist/cli/index.js';
    const content = readFileSync(cliPath, 'utf8');
    if (!content.startsWith('#!')) {
      writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
    }
  },
});
