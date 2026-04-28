import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing the module
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'node:child_process';
import { getStagedFiles, NotAGitRepoError } from '../../src/infrastructure/staged-files.js';
import { resolve } from 'node:path';

const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getStagedFiles', () => {
  it('returns absolute paths of staged files', () => {
    mockExecSync.mockReturnValue('src/tests/foo.spec.ts\nsrc/tests/bar.spec.ts\n');
    const cwd = '/project';
    const files = getStagedFiles(cwd);
    expect(files).toEqual([
      resolve(cwd, 'src/tests/foo.spec.ts'),
      resolve(cwd, 'src/tests/bar.spec.ts'),
    ]);
  });

  it('returns empty array when no files are staged', () => {
    mockExecSync.mockReturnValue('');
    const files = getStagedFiles('/project');
    expect(files).toEqual([]);
  });

  it('filters empty lines', () => {
    mockExecSync.mockReturnValue('\nfoo.spec.ts\n\n');
    const files = getStagedFiles('/project');
    expect(files).toHaveLength(1);
  });

  it('throws NotAGitRepoError when not in a git repo', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('fatal: not a git repository');
    });
    expect(() => getStagedFiles('/project')).toThrow(NotAGitRepoError);
  });

  it('throws NotAGitRepoError on any git error', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('some other git error');
    });
    expect(() => getStagedFiles('/project')).toThrow(NotAGitRepoError);
  });

  it('calls git diff --name-only --cached', () => {
    mockExecSync.mockReturnValue('');
    getStagedFiles('/project');
    expect(mockExecSync).toHaveBeenCalledWith(
      'git diff --name-only --cached',
      expect.objectContaining({ encoding: 'utf-8' })
    );
  });
});
