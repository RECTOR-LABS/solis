import { describe, it, expect } from 'vitest';
import {
  extractEvidence,
  hasEvidence,
  evidenceCount,
  compactNumber,
  protocolMatches,
} from '@/lib/evidence';
import type { Narrative, FortnightlyReport } from '@solis/shared';

// --- Helpers ---

function makeNarrative(overrides: Partial<Narrative> = {}): Narrative {
  return {
    id: 'test-1',
    name: 'Test Narrative',
    slug: 'test-narrative',
    description: 'A test narrative',
    stage: 'EMERGING',
    momentum: 'accelerating',
    confidence: 75,
    signals: { leading: [], coincident: [], confirming: [], social: [] },
    relatedRepos: [],
    relatedTokens: [],
    relatedProtocols: [],
    ...overrides,
  };
}

function makeSignals(
  overrides: Partial<FortnightlyReport['signals']> = {},
): FortnightlyReport['signals'] {
  return {
    leading: {
      period: { start: '2026-01-01', end: '2026-01-14' },
      repos: [],
      anomalies: [],
      newRepoClusters: [],
    },
    coincident: {
      period: { start: '2026-01-01', end: '2026-01-14' },
      tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
      dexVolumes: { total: 0, protocols: [] },
      stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
      onchain: [],
    },
    confirming: {
      period: { start: '2026-01-01', end: '2026-01-14' },
      tokens: [],
      trending: [],
      categoryPerformance: [],
    },
    ...overrides,
  };
}

// --- Tests ---

describe('protocolMatches', () => {
  it('matches exact (case-insensitive)', () => {
    expect(protocolMatches('Jito', 'jito')).toBe(true);
    expect(protocolMatches('JITO', 'Jito')).toBe(true);
  });

  it('matches containment — needle in haystack', () => {
    expect(protocolMatches('Jito', 'Jito Tip Router')).toBe(true);
    expect(protocolMatches('Jito', 'jito-stake-pool')).toBe(true);
  });

  it('matches containment — haystack in needle', () => {
    expect(protocolMatches('Jito Stake Pool', 'Jito')).toBe(true);
  });

  it('rejects non-matches', () => {
    expect(protocolMatches('Jito', 'Marinade')).toBe(false);
    expect(protocolMatches('Helium', 'Jupiter')).toBe(false);
  });
});

describe('extractEvidence', () => {
  it('filters repos by relatedRepos', () => {
    const narrative = makeNarrative({
      relatedRepos: ['helium/oracles', 'helium/helium-program-library'],
    });
    const signals = makeSignals({
      leading: {
        period: { start: '2026-01-01', end: '2026-01-14' },
        repos: [
          {
            repo: 'helium/oracles',
            stars: 24, starsDelta: 5, starsZScore: 1.2,
            commits: 19, commitsDelta: 14, commitsZScore: 4.3,
            forks: 3, forksDelta: 1, forksZScore: 0.5,
            contributors: 4, contributorsDelta: 2,
            newRepo: false, language: 'Rust', topics: [],
          },
          {
            repo: 'solana-labs/solana',
            stars: 12000, starsDelta: 50, starsZScore: 0.8,
            commits: 200, commitsDelta: 30, commitsZScore: 1.1,
            forks: 3000, forksDelta: 10, forksZScore: 0.3,
            contributors: 100, contributorsDelta: 5,
            newRepo: false, language: 'Rust', topics: [],
          },
        ],
        anomalies: [],
        newRepoClusters: [],
      },
    });

    const evidence = extractEvidence(narrative, signals);
    expect(evidence.repos).toHaveLength(1);
    expect(evidence.repos[0].repo).toBe('helium/oracles');
  });

  it('filters tokens by relatedTokens (case-insensitive)', () => {
    const narrative = makeNarrative({ relatedTokens: ['HNT', 'iot'] });
    const signals = makeSignals({
      confirming: {
        period: { start: '2026-01-01', end: '2026-01-14' },
        tokens: [
          {
            id: 'helium', symbol: 'HNT', name: 'Helium',
            price: 3.42, priceDelta7d: 12.5, priceDelta14d: -8.2,
            volume24h: 45_200_000, volumeDelta: 5_000_000, volumeZScore: 2.1,
            marketCap: 500_000_000, category: 'depin',
          },
          {
            id: 'solana', symbol: 'SOL', name: 'Solana',
            price: 180, priceDelta7d: 5, priceDelta14d: 2,
            volume24h: 2_000_000_000, volumeDelta: 100_000_000, volumeZScore: 0.8,
            marketCap: 80_000_000_000, category: 'l1',
          },
          {
            id: 'iot', symbol: 'IOT', name: 'Helium IOT',
            price: 0.001, priceDelta7d: 3, priceDelta14d: 1,
            volume24h: 1_000_000, volumeDelta: 100_000, volumeZScore: 0.5,
            marketCap: 10_000_000, category: 'depin',
          },
        ],
        trending: [],
        categoryPerformance: [],
      },
    });

    const evidence = extractEvidence(narrative, signals);
    expect(evidence.tokens).toHaveLength(2);
    expect(evidence.tokens.map(t => t.symbol)).toEqual(['HNT', 'IOT']);
  });

  it('filters TVL/DEX/onchain by fuzzy protocol match', () => {
    const narrative = makeNarrative({ relatedProtocols: ['Jito'] });
    const signals = makeSignals({
      coincident: {
        period: { start: '2026-01-01', end: '2026-01-14' },
        tvl: {
          total: 1_000_000_000, totalDelta: 50_000_000,
          protocols: [
            { protocol: 'Jito Tip Router', category: 'MEV', tvl: 500_000_000, tvlDelta: 30_000_000, tvlDeltaPercent: 6.4, tvlZScore: 3.1 },
            { protocol: 'Marinade', category: 'LST', tvl: 300_000_000, tvlDelta: 10_000_000, tvlDeltaPercent: 3.4, tvlZScore: 1.2 },
          ],
          anomalies: [],
        },
        dexVolumes: {
          total: 500_000_000,
          protocols: [
            { protocol: 'Jito Restaking', volume24h: 10_000_000, volumeDelta: 2_000_000, volumeZScore: 2.5 },
          ],
        },
        stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
        onchain: [
          { programId: 'JitoXyz', programName: 'Jito Staking', txCount: 5000, txDelta: 1000, txZScore: 1.8, uniqueSigners: 200 },
          { programId: 'MrndXyz', programName: 'Marinade Staking', txCount: 3000, txDelta: 500, txZScore: 0.9, uniqueSigners: 150 },
        ],
      },
    });

    const evidence = extractEvidence(narrative, signals);
    expect(evidence.tvl).toHaveLength(1);
    expect(evidence.tvl[0].protocol).toBe('Jito Tip Router');
    expect(evidence.dex).toHaveLength(1);
    expect(evidence.dex[0].protocol).toBe('Jito Restaking');
    expect(evidence.onchain).toHaveLength(1);
    expect(evidence.onchain[0].programName).toBe('Jito Staking');
  });

  it('returns empty arrays for missing optional layers', () => {
    const narrative = makeNarrative({ relatedTokens: ['HNT'] });
    const signals = makeSignals(); // no x or social

    const evidence = extractEvidence(narrative, signals);
    expect(evidence.x).toEqual([]);
    expect(evidence.social).toEqual([]);
  });

  it('matches X topics against narrative name and related items', () => {
    const narrative = makeNarrative({
      name: 'DePIN Expansion',
      relatedTokens: ['HNT'],
      relatedProtocols: ['Helium'],
    });
    const signals = makeSignals({
      x: {
        period: { start: '2026-01-01', end: '2026-01-14' },
        topics: [
          {
            topic: 'Helium Network', tweetCount: 15, tweetCountDelta: 5, tweetCountZScore: 2.1,
            totalEngagement: 50000, engagementDelta: 10000, engagementZScore: 3.2,
            uniqueAuthors: 8, verifiedAuthors: 3, topTweets: [],
          },
          {
            topic: 'Jupiter DEX', tweetCount: 25, tweetCountDelta: 10, tweetCountZScore: 1.5,
            totalEngagement: 80000, engagementDelta: 20000, engagementZScore: 2.0,
            uniqueAuthors: 12, verifiedAuthors: 5, topTweets: [],
          },
        ],
        anomalies: [],
        topByEngagement: [],
        totalTweetsAnalyzed: 100,
      },
    });

    const evidence = extractEvidence(narrative, signals);
    expect(evidence.x).toHaveLength(1);
    expect(evidence.x[0].topic).toBe('Helium Network');
  });
});

describe('hasEvidence / evidenceCount', () => {
  it('returns false / 0 for empty evidence', () => {
    const evidence = extractEvidence(makeNarrative(), makeSignals());
    expect(hasEvidence(evidence)).toBe(false);
    expect(evidenceCount(evidence)).toBe(0);
  });

  it('returns true / correct count for populated evidence', () => {
    const narrative = makeNarrative({ relatedRepos: ['a/b'] });
    const signals = makeSignals({
      leading: {
        period: { start: '2026-01-01', end: '2026-01-14' },
        repos: [{
          repo: 'a/b', stars: 10, starsDelta: 1, starsZScore: 0.5,
          commits: 5, commitsDelta: 2, commitsZScore: 1.0,
          forks: 1, forksDelta: 0, forksZScore: 0,
          contributors: 2, contributorsDelta: 1,
          newRepo: false, language: 'TS', topics: [],
        }],
        anomalies: [],
        newRepoClusters: [],
      },
    });
    const evidence = extractEvidence(narrative, signals);
    expect(hasEvidence(evidence)).toBe(true);
    expect(evidenceCount(evidence)).toBe(1);
  });
});

describe('compactNumber', () => {
  it('formats thousands', () => {
    expect(compactNumber(1234)).toBe('1.2K');
    expect(compactNumber(9999)).toBe('10.0K');
  });

  it('formats millions', () => {
    expect(compactNumber(1_234_567)).toBe('1.2M');
    expect(compactNumber(45_200_000)).toBe('45.2M');
  });

  it('formats billions', () => {
    expect(compactNumber(1_234_567_890)).toBe('1.2B');
  });

  it('formats small numbers as-is', () => {
    expect(compactNumber(42)).toBe('42');
    expect(compactNumber(999)).toBe('999');
  });

  it('handles negative numbers', () => {
    expect(compactNumber(-1_500_000)).toBe('-1.5M');
    expect(compactNumber(-500)).toBe('-500');
  });

  it('handles zero', () => {
    expect(compactNumber(0)).toBe('0');
  });
});
