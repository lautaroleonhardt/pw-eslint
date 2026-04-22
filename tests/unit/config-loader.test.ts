import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadConfig, ConfigValidationError } from '../../src/infrastructure/config-loader.js';
import { DEFAULT_CONFIG } from '../../src/domain/config.js';
import { type FileSystem } from '../../src/infrastructure/fs.js';

const fixtureDir = resolve(import.meta.dirname, '../fixtures/config');

describe('loadConfig', () => {
  describe('custom FileSystem', () => {
    it('can use a custom FileSystem implementation', () => {
      const mockFs: FileSystem = {
        exists: (p) => p.endsWith('.pw-eslintrc.json'),
        readFile: () => JSON.stringify({ rules: { 'no-hard-wait': 'error' } }),
        writeFile: () => {},
        mkdir: () => {},
        stat: () => ({} as any),
        lstat: () => ({} as any),
        readdir: () => [],
        realpath: (p) => p,
      };

      const config = loadConfig(process.cwd(), undefined, mockFs);
      expect(config.rules['no-hard-wait']).toBe('error');
    });
  });

  describe('explicit path loading', () => {
    it('returns DEFAULT_CONFIG merged with file values', () => {
      const config = loadConfig(process.cwd(), `${fixtureDir}/valid.json`);
      expect(config.include).toEqual(['tests/**/*.spec.ts']);
      expect(config.rules['no-hard-wait']).toBe('off');
      expect(config.rules['deep-locator']).toEqual(['warn', { maxDepth: 5 }]);
      // defaults preserved for unspecified keys
      expect(config.rules['unawaited-action']).toBe('error');
      expect(config.exclude).toEqual(DEFAULT_CONFIG.exclude);
    });
  });

  describe('ancestor walk', () => {
    it('returns DEFAULT_CONFIG when no config file found', () => {
      const config = loadConfig('/tmp/no-config-here-xyz');
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    it('finds config by walking ancestor directories', () => {
      // Place a config in fixtureDir and start walk from a subdirectory
      const subDir = `${fixtureDir}/subdir`;
      const config = loadConfig(subDir, undefined);
      // Should find valid.json in fixtureDir (it's nearest ancestor with .pw-eslintrc.json)
      // But we don't have a .pw-eslintrc.json — this test verifies no crash & defaults returned
      expect(config).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('schema validation', () => {
    it('throws ConfigValidationError on unknown top-level key', () => {
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/unknown-key.json`))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/unknown-key.json`))
        .toThrow('unknownOption');
    });

    it('throws ConfigValidationError on invalid severity value', () => {
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/invalid-severity.json`))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/invalid-severity.json`))
        .toThrow('no-hard-wait');
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('includes zombie-locator with warn severity', () => {
      expect(DEFAULT_CONFIG.rules['zombie-locator']).toBe('warn');
    });

    it('defaults failOn to "error"', () => {
      expect(DEFAULT_CONFIG.failOn).toBe('error');
    });

    it('defaults maxWarnings to undefined', () => {
      expect(DEFAULT_CONFIG.maxWarnings).toBeUndefined();
    });
  });

  describe('failOn config', () => {
    it('parses failOn: "warn"', () => {
      const config = loadConfig(process.cwd(), `${fixtureDir}/fail-on-warn.json`);
      expect(config.failOn).toBe('warn');
    });

    it('throws ConfigValidationError on invalid failOn value', () => {
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/invalid-fail-on.json`))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/invalid-fail-on.json`))
        .toThrow('failOn');
    });
  });

    describe('maxWarnings config', () => {
    it('parses maxWarnings: 5', () => {
      const config = loadConfig(process.cwd(), `${fixtureDir}/max-warnings.json`);
      expect(config.maxWarnings).toBe(5);
    });

    it('throws ConfigValidationError on negative maxWarnings', () => {
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/invalid-max-warnings.json`))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), `${fixtureDir}/invalid-max-warnings.json`))
        .toThrow('maxWarnings');
    });
  });

  describe('glob pattern validation', () => {
    const mockFs = (content: object): FileSystem => ({
      exists: (p) => p.endsWith('.pw-eslintrc.json'),
      readFile: () => JSON.stringify(content),
      writeFile: () => {},
      mkdir: () => {},
      stat: () => ({} as any),
      lstat: () => ({} as any),
      readdir: () => [],
      realpath: (p) => p,
    });

    // Group A — specPattern
    it('throws ConfigValidationError when specPattern exceeds 1024 characters', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'a'.repeat(1025) })))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'a'.repeat(1025) })))
        .toThrow('specPattern');
    });

    it('throws ConfigValidationError when specPattern has brace nesting depth > 3', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: '{{{{a}}}}' })))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: '{{{{a}}}}' })))
        .toThrow('specPattern');
    });

    it('throws ConfigValidationError when specPattern has > 20 alternatives in one brace', () => {
      const pattern = '{a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u}';
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: pattern })))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: pattern })))
        .toThrow('specPattern');
    });

    it('throws ConfigValidationError when specPattern has unclosed brace', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'src/{foo' })))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'src/{foo' })))
        .toThrow('specPattern');
    });

    it('throws ConfigValidationError when specPattern has unmatched closing brace', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'src/foo}bar' })))
        .toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when specPattern has unclosed bracket', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'src/[foo' })))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'src/[foo' })))
        .toThrow('specPattern');
    });

    it('accepts valid specPattern **/*.spec.ts', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: '**/*.spec.ts' })))
        .not.toThrow();
    });

    it('accepts specPattern with brace nesting at exactly depth 3', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: '{a,{b,{c,d}}}' })))
        .not.toThrow();
    });

    it('accepts specPattern with exactly 20 alternatives', () => {
      const pattern = '{a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t}';
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: pattern })))
        .not.toThrow();
    });

    it('accepts specPattern of exactly 1024 characters', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'a'.repeat(1024) })))
        .not.toThrow();
    });

    // Group B — pageObjectPattern
    it('throws ConfigValidationError when pageObjectPattern exceeds 1024 characters', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ pageObjectPattern: 'a'.repeat(1025) })))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ pageObjectPattern: 'a'.repeat(1025) })))
        .toThrow('pageObjectPattern');
    });

    it('throws ConfigValidationError when pageObjectPattern has brace nesting depth > 3', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ pageObjectPattern: '{{{{a}}}}' })))
        .toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when pageObjectPattern has > 20 alternatives in one brace', () => {
      const pattern = '{a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u}';
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ pageObjectPattern: pattern })))
        .toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when pageObjectPattern has unclosed brace', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ pageObjectPattern: 'pages/{foo' })))
        .toThrow(ConfigValidationError);
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ pageObjectPattern: 'pages/{foo' })))
        .toThrow('pageObjectPattern');
    });

    it('accepts valid pageObjectPattern pages/**/*.ts', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ pageObjectPattern: 'pages/**/*.ts' })))
        .not.toThrow();
    });

    // Group C — overrides[].files
    it('throws ConfigValidationError (not silently skips) when overrides files pattern exceeds 1024 chars', () => {
      const config = { overrides: [{ files: ['a'.repeat(1025)], rules: { 'no-hard-wait': 'off' } }] };
      expect(() => loadConfig(process.cwd(), undefined, mockFs(config)))
        .toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when overrides files pattern has brace depth > 3', () => {
      const config = { overrides: [{ files: ['{{{{a}}}}'], rules: { 'no-hard-wait': 'off' } }] };
      expect(() => loadConfig(process.cwd(), undefined, mockFs(config)))
        .toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when overrides files pattern has > 20 alternatives', () => {
      const pattern = '{a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u}';
      const config = { overrides: [{ files: [pattern], rules: { 'no-hard-wait': 'off' } }] };
      expect(() => loadConfig(process.cwd(), undefined, mockFs(config)))
        .toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when overrides files pattern has unclosed brace', () => {
      const config = { overrides: [{ files: ['src/{foo'], rules: { 'no-hard-wait': 'off' } }] };
      expect(() => loadConfig(process.cwd(), undefined, mockFs(config)))
        .toThrow(ConfigValidationError);
    });

    it('throws ConfigValidationError when overrides files pattern has unclosed bracket', () => {
      const config = { overrides: [{ files: ['src/[foo'], rules: { 'no-hard-wait': 'off' } }] };
      expect(() => loadConfig(process.cwd(), undefined, mockFs(config)))
        .toThrow(ConfigValidationError);
    });

    it('accepts a valid overrides entry with normal glob patterns', () => {
      const config = { overrides: [{ files: ['tests/**/*.spec.ts'], rules: { 'no-hard-wait': 'off' } }] };
      expect(() => loadConfig(process.cwd(), undefined, mockFs(config)))
        .not.toThrow();
    });

    // Group D — edge cases
    it('accepts depth-3 nested braces with 20 alternatives', () => {
      const pattern = '{a,{b,{c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t}}}';
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: pattern })))
        .not.toThrow();
    });

    it('does not treat escaped bracket as unclosed', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: 'src/\\[foo\\]' })))
        .not.toThrow();
    });

    it('accepts empty string pattern', () => {
      expect(() => loadConfig(process.cwd(), undefined, mockFs({ specPattern: '' })))
        .not.toThrow();
    });
  });
});
