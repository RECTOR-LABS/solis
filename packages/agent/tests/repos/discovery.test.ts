import { describe, it, expect, vi } from 'vitest';

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

import { inferCategory, filterValid, toTrackedRepos, mergeRepos } from '../../src/repos/discovery.js';
import type { TrackedRepo } from '../../src/repos/curated.js';

describe('inferCategory', () => {
  it('should map known topic to category', () => {
    expect(inferCategory(['solana', 'defi'])).toBe('defi-dex');
    expect(inferCategory(['nft', 'art'])).toBe('nft');
    expect(inferCategory(['oracle'])).toBe('oracle');
  });

  it('should return first matching topic (priority)', () => {
    expect(inferCategory(['lending', 'defi'])).toBe('defi-lending');
    expect(inferCategory(['defi', 'lending'])).toBe('defi-dex');
  });

  it('should fallback to discovered for unknown topics', () => {
    expect(inferCategory(['blockchain', 'rust'])).toBe('discovered');
    expect(inferCategory(['random-topic'])).toBe('discovered');
  });

  it('should fallback to discovered for empty array', () => {
    expect(inferCategory([])).toBe('discovered');
  });

  it('should be case-insensitive', () => {
    expect(inferCategory(['DeFi'])).toBe('defi-dex');
    expect(inferCategory(['NFT'])).toBe('nft');
    expect(inferCategory(['ORACLE'])).toBe('oracle');
  });
});

describe('filterValid', () => {
  it('should filter out archived repos', () => {
    const items = [
      { full_name: 'org/active', archived: false, stargazers_count: 100, topics: [] },
      { full_name: 'org/archived', archived: true, stargazers_count: 200, topics: [] },
    ];
    const result = filterValid(items);
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe('org/active');
  });

  it('should filter out malformed names', () => {
    const items = [
      { full_name: 'org/repo', archived: false, stargazers_count: 100, topics: [] },
      { full_name: 'noslash', archived: false, stargazers_count: 100, topics: [] },
      { full_name: '/noowner', archived: false, stargazers_count: 100, topics: [] },
      { full_name: 'noname/', archived: false, stargazers_count: 100, topics: [] },
    ];
    const result = filterValid(items);
    expect(result).toHaveLength(1);
    expect(result[0].full_name).toBe('org/repo');
  });

  it('should pass through valid repos', () => {
    const items = [
      { full_name: 'solana-labs/solana', archived: false, stargazers_count: 10000, topics: ['solana'] },
      { full_name: 'coral-xyz/anchor', archived: false, stargazers_count: 5000, topics: ['anchor'] },
    ];
    expect(filterValid(items)).toHaveLength(2);
  });

  it('should handle empty array', () => {
    expect(filterValid([])).toHaveLength(0);
  });
});

describe('toTrackedRepos', () => {
  it('should convert search items to TrackedRepo with weight 1', () => {
    const items = [
      { full_name: 'org/repo', archived: false, stargazers_count: 100, topics: ['defi'] },
    ];
    const result = toTrackedRepos(items);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      repo: 'org/repo',
      category: 'defi-dex',
      weight: 1,
    });
  });

  it('should infer category from topics', () => {
    const items = [
      { full_name: 'a/b', archived: false, stargazers_count: 50, topics: ['nft', 'solana'] },
      { full_name: 'c/d', archived: false, stargazers_count: 50, topics: ['unknown'] },
    ];
    const result = toTrackedRepos(items);
    expect(result[0].category).toBe('nft');
    expect(result[1].category).toBe('discovered');
  });

  it('should handle items with empty topics', () => {
    const items = [
      { full_name: 'org/repo', archived: false, stargazers_count: 100, topics: [] },
    ];
    const result = toTrackedRepos(items);
    expect(result[0].category).toBe('discovered');
    expect(result[0].weight).toBe(1);
  });
});

describe('mergeRepos', () => {
  const curated: TrackedRepo[] = [
    { repo: 'solana-labs/solana', category: 'core', weight: 3 },
    { repo: 'jup-ag/jupiter-cpi', category: 'defi-dex', weight: 3 },
  ];

  it('should merge without duplicates', () => {
    const discovered: TrackedRepo[] = [
      { repo: 'new-org/new-repo', category: 'discovered', weight: 1 },
    ];
    const result = mergeRepos(curated, discovered);
    expect(result).toHaveLength(3);
    expect(result[2].repo).toBe('new-org/new-repo');
  });

  it('should deduplicate case-insensitively', () => {
    const discovered: TrackedRepo[] = [
      { repo: 'Solana-Labs/Solana', category: 'discovered', weight: 1 },
    ];
    const result = mergeRepos(curated, discovered);
    expect(result).toHaveLength(2);
  });

  it('should preserve curated weight and category on collision', () => {
    const discovered: TrackedRepo[] = [
      { repo: 'solana-labs/solana', category: 'discovered', weight: 1 },
    ];
    const result = mergeRepos(curated, discovered);
    const solana = result.find(r => r.repo.toLowerCase() === 'solana-labs/solana');
    expect(solana?.weight).toBe(3);
    expect(solana?.category).toBe('core');
  });

  it('should handle empty curated list', () => {
    const discovered: TrackedRepo[] = [
      { repo: 'org/repo', category: 'discovered', weight: 1 },
    ];
    const result = mergeRepos([], discovered);
    expect(result).toHaveLength(1);
  });

  it('should handle empty discovered list', () => {
    const result = mergeRepos(curated, []);
    expect(result).toHaveLength(2);
  });

  it('should handle both empty', () => {
    const result = mergeRepos([], []);
    expect(result).toHaveLength(0);
  });
});
