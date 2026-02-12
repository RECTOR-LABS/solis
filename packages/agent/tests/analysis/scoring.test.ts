import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  GitHubSignals,
  GitHubRepoSignal,
  CoincidentSignals,
  ConfirmingSignals,
  TokenSignal,
  TVLSignal,
  DEXVolumeSignal,
  OnchainSignal,
} from '@solis/shared';

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { scoreSignals } from '../../src/analysis/scoring.js';

// --- Fixtures ---

function makeRepo(overrides: Partial<GitHubRepoSignal> = {}): GitHubRepoSignal {
  return {
    repo: 'owner/repo',
    stars: 100, starsDelta: 5, starsZScore: 0,
    commits: 50, commitsDelta: 10, commitsZScore: 0,
    forks: 20, forksDelta: 2, forksZScore: 0,
    contributors: 5, contributorsDelta: 1,
    newRepo: false,
    language: 'TypeScript',
    topics: [],
    ...overrides,
  };
}

function makeLeading(repos: GitHubRepoSignal[] = []): GitHubSignals {
  return {
    period: { start: '2026-01-29', end: '2026-02-12' },
    repos,
    anomalies: [],
    newRepoClusters: [],
  };
}

function makeTVLProtocol(overrides: Partial<TVLSignal> = {}): TVLSignal {
  return {
    protocol: 'test-protocol',
    category: 'DEX',
    tvl: 1_000_000,
    tvlDelta: 50_000,
    tvlDeltaPercent: 5,
    tvlZScore: 0,
    ...overrides,
  };
}

function makeDEXProtocol(overrides: Partial<DEXVolumeSignal> = {}): DEXVolumeSignal {
  return {
    protocol: 'test-dex',
    volume24h: 100_000,
    volumeDelta: 10_000,
    volumeZScore: 0,
    ...overrides,
  };
}

function makeOnchain(overrides: Partial<OnchainSignal> = {}): OnchainSignal {
  return {
    programId: 'abc123',
    programName: 'test-program',
    txCount: 1000,
    txDelta: 100,
    txZScore: 0,
    uniqueSigners: 50,
    ...overrides,
  };
}

function makeCoincident(
  tvlProtocols: TVLSignal[] = [],
  dexProtocols: DEXVolumeSignal[] = [],
  onchain: OnchainSignal[] = [],
): CoincidentSignals {
  return {
    period: { start: '2026-01-29', end: '2026-02-12' },
    tvl: { total: 10_000_000, totalDelta: 500_000, protocols: tvlProtocols, anomalies: [] },
    dexVolumes: { total: 500_000, protocols: dexProtocols },
    stablecoinFlows: { netFlow: 100_000, inflows: 200_000, outflows: 100_000 },
    onchain,
  };
}

function makeToken(overrides: Partial<TokenSignal> = {}): TokenSignal {
  return {
    id: 'test-token',
    symbol: 'TST',
    name: 'Test Token',
    price: 1.5,
    priceDelta7d: 0.1,
    priceDelta14d: 0.2,
    volume24h: 500_000,
    volumeDelta: 50_000,
    volumeZScore: 0,
    marketCap: 10_000_000,
    category: 'DeFi',
    ...overrides,
  };
}

function makeConfirming(tokens: TokenSignal[] = []): ConfirmingSignals {
  return {
    period: { start: '2026-01-29', end: '2026-02-12' },
    tokens,
    trending: [],
    categoryPerformance: [],
  };
}

describe('scoreSignals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should enrich GitHub repos with z-scores', () => {
    const repos = [
      makeRepo({ repo: 'a/1', commitsDelta: 10, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/2', commitsDelta: 12, starsDelta: 6, forksDelta: 3 }),
      makeRepo({ repo: 'a/3', commitsDelta: 11, starsDelta: 7, forksDelta: 2 }),
      makeRepo({ repo: 'a/4', commitsDelta: 100, starsDelta: 200, forksDelta: 50 }),
    ];

    const result = scoreSignals(makeLeading(repos), makeCoincident(), makeConfirming());

    // Outlier should have highest z-scores
    const outlier = result.leading.repos.find(r => r.repo === 'a/4')!;
    expect(outlier.commitsZScore).toBeGreaterThan(1);
    expect(outlier.starsZScore).toBeGreaterThan(1);
    expect(outlier.forksZScore).toBeGreaterThan(1);
  });

  it('should detect GitHub anomalies on high-z repos', () => {
    const repos = [
      makeRepo({ repo: 'a/normal1', commitsDelta: 10, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/normal2', commitsDelta: 12, starsDelta: 6, forksDelta: 3 }),
      makeRepo({ repo: 'a/normal3', commitsDelta: 11, starsDelta: 7, forksDelta: 2 }),
      makeRepo({ repo: 'a/normal4', commitsDelta: 10, starsDelta: 5, forksDelta: 3 }),
      makeRepo({ repo: 'a/normal5', commitsDelta: 11, starsDelta: 6, forksDelta: 2 }),
      makeRepo({ repo: 'a/outlier', commitsDelta: 500, starsDelta: 1000, forksDelta: 200 }),
    ];

    const result = scoreSignals(makeLeading(repos), makeCoincident(), makeConfirming());

    expect(result.leading.anomalies.length).toBeGreaterThan(0);
    expect(result.leading.anomalies.some(a => a.repo === 'a/outlier')).toBe(true);
  });

  it('should deduplicate anomaly repos across metrics', () => {
    // Repo anomalous on ALL 3 metrics should appear only once in anomalies
    const repos = [
      makeRepo({ repo: 'a/1', commitsDelta: 5, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/2', commitsDelta: 6, starsDelta: 6, forksDelta: 3 }),
      makeRepo({ repo: 'a/3', commitsDelta: 5, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/4', commitsDelta: 6, starsDelta: 6, forksDelta: 3 }),
      makeRepo({ repo: 'a/5', commitsDelta: 5, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/mega', commitsDelta: 500, starsDelta: 500, forksDelta: 200 }),
    ];

    const result = scoreSignals(makeLeading(repos), makeCoincident(), makeConfirming());

    const megaCount = result.leading.anomalies.filter(a => a.repo === 'a/mega').length;
    expect(megaCount).toBe(1);
  });

  it('should cluster new repos by topic (2+ repos needed)', () => {
    const repos = [
      makeRepo({ repo: 'a/depin1', newRepo: true, topics: ['depin', 'solana'] }),
      makeRepo({ repo: 'a/depin2', newRepo: true, topics: ['depin', 'iot'] }),
      makeRepo({ repo: 'a/solo', newRepo: true, topics: ['unique-topic'] }),
      makeRepo({ repo: 'a/old', newRepo: false, topics: ['depin'] }),
    ];

    const result = scoreSignals(makeLeading(repos), makeCoincident(), makeConfirming());

    // 'depin' has 2 new repos → should cluster
    expect(result.leading.newRepoClusters.some(c => c.topic === 'depin')).toBe(true);
    const depinCluster = result.leading.newRepoClusters.find(c => c.topic === 'depin')!;
    expect(depinCluster.repos).toHaveLength(2);
    expect(depinCluster.count).toBe(2);

    // 'unique-topic' and 'iot' have only 1 new repo each → no cluster
    expect(result.leading.newRepoClusters.some(c => c.topic === 'unique-topic')).toBe(false);
  });

  it('should enrich TVL protocols with z-scores and detect anomalies', () => {
    const protocols = [
      makeTVLProtocol({ protocol: 'normal1', tvlDeltaPercent: 5 }),
      makeTVLProtocol({ protocol: 'normal2', tvlDeltaPercent: 6 }),
      makeTVLProtocol({ protocol: 'normal3', tvlDeltaPercent: 5 }),
      makeTVLProtocol({ protocol: 'normal4', tvlDeltaPercent: 7 }),
      makeTVLProtocol({ protocol: 'normal5', tvlDeltaPercent: 6 }),
      makeTVLProtocol({ protocol: 'outlier', tvlDeltaPercent: 200 }),
    ];

    const result = scoreSignals(makeLeading(), makeCoincident(protocols), makeConfirming());

    const outlier = result.coincident.tvl.protocols.find(p => p.protocol === 'outlier')!;
    expect(outlier.tvlZScore).toBeGreaterThan(1);
    expect(result.coincident.tvl.anomalies.some(a => a.protocol === 'outlier')).toBe(true);
  });

  it('should enrich DEX volume and onchain signals with z-scores', () => {
    const dex = [
      makeDEXProtocol({ protocol: 'dex1', volume24h: 100_000 }),
      makeDEXProtocol({ protocol: 'dex2', volume24h: 110_000 }),
      makeDEXProtocol({ protocol: 'dex3', volume24h: 105_000 }),
      makeDEXProtocol({ protocol: 'dex-big', volume24h: 5_000_000 }),
    ];
    const onchain = [
      makeOnchain({ programName: 'p1', txCount: 1000 }),
      makeOnchain({ programName: 'p2', txCount: 1100 }),
      makeOnchain({ programName: 'p3', txCount: 1050 }),
      makeOnchain({ programName: 'p-hot', txCount: 50_000 }),
    ];

    const result = scoreSignals(makeLeading(), makeCoincident([], dex, onchain), makeConfirming());

    const bigDex = result.coincident.dexVolumes.protocols.find(p => p.protocol === 'dex-big')!;
    expect(bigDex.volumeZScore).toBeGreaterThan(1);

    const hotProgram = result.coincident.onchain.find(s => s.programName === 'p-hot')!;
    expect(hotProgram.txZScore).toBeGreaterThan(1);
  });

  it('should enrich confirming tokens with z-scores', () => {
    const tokens = [
      makeToken({ id: 't1', volume24h: 500_000 }),
      makeToken({ id: 't2', volume24h: 520_000 }),
      makeToken({ id: 't3', volume24h: 510_000 }),
      makeToken({ id: 't-moon', volume24h: 50_000_000 }),
    ];

    const result = scoreSignals(makeLeading(), makeCoincident(), makeConfirming(tokens));

    const moon = result.confirming.tokens.find(t => t.id === 't-moon')!;
    expect(moon.volumeZScore).toBeGreaterThan(1);
  });

  it('should produce correct summary counts', () => {
    const repos = [
      makeRepo({ repo: 'a/1', commitsDelta: 5, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/2', commitsDelta: 6, starsDelta: 6, forksDelta: 3 }),
      makeRepo({ repo: 'a/3', commitsDelta: 5, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/4', commitsDelta: 6, starsDelta: 6, forksDelta: 3 }),
      makeRepo({ repo: 'a/5', commitsDelta: 5, starsDelta: 5, forksDelta: 2 }),
      makeRepo({ repo: 'a/outlier', commitsDelta: 500, starsDelta: 500, forksDelta: 200 }),
    ];
    const protocols = [
      makeTVLProtocol({ protocol: 'p1', tvlDeltaPercent: 5 }),
      makeTVLProtocol({ protocol: 'p2', tvlDeltaPercent: 6 }),
      makeTVLProtocol({ protocol: 'p3', tvlDeltaPercent: 5 }),
      makeTVLProtocol({ protocol: 'p4', tvlDeltaPercent: 6 }),
      makeTVLProtocol({ protocol: 'p5', tvlDeltaPercent: 5 }),
      makeTVLProtocol({ protocol: 'p-outlier', tvlDeltaPercent: 300 }),
    ];

    const result = scoreSignals(makeLeading(repos), makeCoincident(protocols), makeConfirming());

    expect(result.summary.leadingAnomalies).toBe(result.leading.anomalies.length);
    expect(result.summary.totalAnomalies).toBe(
      result.summary.leadingAnomalies +
      result.summary.coincidentAnomalies +
      result.summary.confirmingAnomalies,
    );
    expect(result.summary.totalAnomalies).toBeGreaterThan(0);
  });

  it('should handle empty signals gracefully', () => {
    const result = scoreSignals(makeLeading(), makeCoincident(), makeConfirming());

    expect(result.leading.anomalies).toEqual([]);
    expect(result.leading.newRepoClusters).toEqual([]);
    expect(result.coincident.tvl.anomalies).toEqual([]);
    expect(result.confirming.tokens).toEqual([]);
    expect(result.summary.totalAnomalies).toBe(0);
  });

  it('should not crash on single-item arrays', () => {
    const result = scoreSignals(
      makeLeading([makeRepo()]),
      makeCoincident([makeTVLProtocol()], [makeDEXProtocol()], [makeOnchain()]),
      makeConfirming([makeToken()]),
    );

    // Single items can't have anomalies (stdDev = 0)
    expect(result.summary.totalAnomalies).toBe(0);
  });
});
