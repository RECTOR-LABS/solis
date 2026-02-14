import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GitHubRepoSignal } from '@solis/shared';

vi.mock('../../src/config.js', () => ({
  env: {
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

function makeRepo(overrides: Partial<GitHubRepoSignal> = {}): GitHubRepoSignal {
  return {
    repo: 'test/repo',
    stars: 1000,
    starsDelta: 0,
    starsZScore: 0,
    commits: 50,
    commitsDelta: 10,
    commitsZScore: 0,
    forks: 100,
    forksDelta: 5,
    forksZScore: 0,
    contributors: 20,
    contributorsDelta: 2,
    newRepo: false,
    language: 'Rust',
    topics: ['solana'],
    ...overrides,
  };
}

describe('Star History', () => {
  let tempDir: string;
  let historyPath: string;
  let recordStars: typeof import('../../src/cache/star-history.js').recordStars;
  let loadStarHistory: typeof import('../../src/cache/star-history.js').loadStarHistory;
  let enrichWithStarHistory: typeof import('../../src/cache/star-history.js').enrichWithStarHistory;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'solis-stars-'));
    historyPath = join(tempDir, 'github', 'star-history.json');
    const mod = await import('../../src/cache/star-history.js');
    recordStars = mod.recordStars;
    loadStarHistory = mod.loadStarHistory;
    enrichWithStarHistory = mod.enrichWithStarHistory;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('recordStars', () => {
    it('should create history file from scratch', async () => {
      await recordStars(
        [{ repo: 'test/repo', stars: 1000 }],
        '2026-02-14',
        historyPath,
      );

      const raw = await readFile(historyPath, 'utf-8');
      const history = JSON.parse(raw);
      expect(history['test/repo']).toHaveLength(1);
      expect(history['test/repo'][0]).toEqual({ date: '2026-02-14', stars: 1000 });
    });

    it('should append new date without duplicating', async () => {
      await recordStars([{ repo: 'test/repo', stars: 1000 }], '2026-02-13', historyPath);
      await recordStars([{ repo: 'test/repo', stars: 1010 }], '2026-02-14', historyPath);

      const history = await loadStarHistory(historyPath);
      expect(history['test/repo']).toHaveLength(2);
      expect(history['test/repo'][1].stars).toBe(1010);
    });

    it('should update existing date entry', async () => {
      await recordStars([{ repo: 'test/repo', stars: 1000 }], '2026-02-14', historyPath);
      await recordStars([{ repo: 'test/repo', stars: 1050 }], '2026-02-14', historyPath);

      const history = await loadStarHistory(historyPath);
      expect(history['test/repo']).toHaveLength(1);
      expect(history['test/repo'][0].stars).toBe(1050);
    });

    it('should track multiple repos independently', async () => {
      await recordStars(
        [
          { repo: 'org/alpha', stars: 500 },
          { repo: 'org/beta', stars: 300 },
        ],
        '2026-02-14',
        historyPath,
      );

      const history = await loadStarHistory(historyPath);
      expect(Object.keys(history)).toEqual(['org/alpha', 'org/beta']);
    });
  });

  describe('loadStarHistory', () => {
    it('should return empty object for non-existent file', async () => {
      const history = await loadStarHistory(join(tempDir, 'nope.json'));
      expect(history).toEqual({});
    });
  });

  describe('enrichWithStarHistory', () => {
    it('should skip repos with no history', () => {
      const repos = [makeRepo({ repo: 'test/repo', stars: 1000 })];
      enrichWithStarHistory(repos, {}, '2026-02-14');
      expect(repos[0].stars7d).toBeUndefined();
      expect(repos[0].stars30d).toBeUndefined();
      expect(repos[0].starsVelocity).toBeUndefined();
    });

    it('should skip repos with only one snapshot', () => {
      const repos = [makeRepo({ repo: 'test/repo', stars: 1000 })];
      const history = { 'test/repo': [{ date: '2026-02-14', stars: 1000 }] };
      enrichWithStarHistory(repos, history, '2026-02-14');
      expect(repos[0].stars7d).toBeUndefined();
    });

    it('should compute 7-day delta', () => {
      const repos = [makeRepo({ repo: 'test/repo', stars: 1100 })];
      const history = {
        'test/repo': [
          { date: '2026-02-07', stars: 1000 },
          { date: '2026-02-14', stars: 1100 },
        ],
      };
      enrichWithStarHistory(repos, history, '2026-02-14');
      expect(repos[0].stars7d).toBe(100);
      expect(repos[0].starsVelocity).toBeCloseTo(100 / 7);
    });

    it('should compute 30-day delta', () => {
      const repos = [makeRepo({ repo: 'test/repo', stars: 1500 })];
      const history = {
        'test/repo': [
          { date: '2026-01-15', stars: 1000 },
          { date: '2026-02-07', stars: 1400 },
          { date: '2026-02-14', stars: 1500 },
        ],
      };
      enrichWithStarHistory(repos, history, '2026-02-14');
      expect(repos[0].stars30d).toBe(500);
      expect(repos[0].stars7d).toBe(100);
    });

    it('should use closest earlier snapshot when exact date not available', () => {
      const repos = [makeRepo({ repo: 'test/repo', stars: 1200 })];
      const history = {
        'test/repo': [
          { date: '2026-02-05', stars: 1050 }, // 9 days ago — closest to 7d target
          { date: '2026-02-14', stars: 1200 },
        ],
      };
      enrichWithStarHistory(repos, history, '2026-02-14');
      expect(repos[0].stars7d).toBe(150); // 1200 - 1050
    });

    it('should handle zero star growth', () => {
      const repos = [makeRepo({ repo: 'test/repo', stars: 1000 })];
      const history = {
        'test/repo': [
          { date: '2026-02-07', stars: 1000 },
          { date: '2026-02-14', stars: 1000 },
        ],
      };
      enrichWithStarHistory(repos, history, '2026-02-14');
      expect(repos[0].stars7d).toBe(0);
      expect(repos[0].starsVelocity).toBe(0);
    });

    it('should handle negative star growth (star removal)', () => {
      const repos = [makeRepo({ repo: 'test/repo', stars: 900 })];
      const history = {
        'test/repo': [
          { date: '2026-02-07', stars: 1000 },
          { date: '2026-02-14', stars: 900 },
        ],
      };
      enrichWithStarHistory(repos, history, '2026-02-14');
      expect(repos[0].stars7d).toBe(-100);
    });

    it('should enrich multiple repos', () => {
      const repos = [
        makeRepo({ repo: 'org/alpha', stars: 1100 }),
        makeRepo({ repo: 'org/beta', stars: 550 }),
      ];
      const history = {
        'org/alpha': [
          { date: '2026-02-07', stars: 1000 },
          { date: '2026-02-14', stars: 1100 },
        ],
        'org/beta': [
          { date: '2026-02-07', stars: 500 },
          { date: '2026-02-14', stars: 550 },
        ],
      };
      enrichWithStarHistory(repos, history, '2026-02-14');
      expect(repos[0].stars7d).toBe(100);
      expect(repos[1].stars7d).toBe(50);
    });
  });
});
