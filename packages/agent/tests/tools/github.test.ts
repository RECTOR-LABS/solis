import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    GITHUB_TOKEN: 'test-token',
    LOG_LEVEL: 'error',
    isDevelopment: false,
  },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

describe('GitHub collector', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should export collectGitHub function', async () => {
    const { collectGitHub } = await import('../../src/tools/github.js');
    expect(collectGitHub).toBeDefined();
    expect(typeof collectGitHub).toBe('function');
  });
});

describe('Curated repos', () => {
  it('should have 50+ repos', async () => {
    const { CURATED_REPOS } = await import('../../src/repos/curated.js');
    expect(CURATED_REPOS.length).toBeGreaterThanOrEqual(50);
  });

  it('should have valid repo format (owner/name)', async () => {
    const { CURATED_REPOS } = await import('../../src/repos/curated.js');
    for (const entry of CURATED_REPOS) {
      expect(entry.repo).toMatch(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/);
    }
  });

  it('should have valid weights (1-3)', async () => {
    const { CURATED_REPOS } = await import('../../src/repos/curated.js');
    for (const entry of CURATED_REPOS) {
      expect(entry.weight).toBeGreaterThanOrEqual(1);
      expect(entry.weight).toBeLessThanOrEqual(3);
    }
  });

  it('should have non-empty categories', async () => {
    const { CURATED_REPOS } = await import('../../src/repos/curated.js');
    for (const entry of CURATED_REPOS) {
      expect(entry.category).toBeTruthy();
    }
  });

  it('should return filtered repos by category', async () => {
    const { getReposByCategory } = await import('../../src/repos/curated.js');
    const core = getReposByCategory('core');
    expect(core.length).toBeGreaterThan(0);
    expect(core.every(r => r.category === 'core')).toBe(true);
  });

  it('should return high-weight repos', async () => {
    const { getHighWeightRepos } = await import('../../src/repos/curated.js');
    const high = getHighWeightRepos();
    expect(high.length).toBeGreaterThan(0);
    expect(high.every(r => r.weight >= 2)).toBe(true);
  });

  it('should return all unique categories', async () => {
    const { getCategories } = await import('../../src/repos/curated.js');
    const cats = getCategories();
    expect(cats.length).toBeGreaterThan(5);
    expect(new Set(cats).size).toBe(cats.length);
  });
});
