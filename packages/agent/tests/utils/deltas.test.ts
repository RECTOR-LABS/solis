import { describe, it, expect, vi } from 'vitest';
import type {
  FortnightlyReport,
  GitHubSignals,
  CoincidentSignals,
  ConfirmingSignals,
} from '@solis/shared';

vi.mock('../../src/config.js', () => ({
  env: { LOG_LEVEL: 'error', isDevelopment: false },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn() }),
  },
}));

import { applyDeltas } from '../../src/utils/deltas.js';

function makeLeading(repos: Array<{ repo: string; stars: number; forks: number; contributors: number }>): GitHubSignals {
  return {
    period: { start: '2026-02-01', end: '2026-02-12' },
    repos: repos.map(r => ({
      ...r,
      starsDelta: 0,
      starsZScore: 0,
      commits: 0,
      commitsDelta: 0,
      commitsZScore: 0,
      forksDelta: 0,
      forksZScore: 0,
      contributorsDelta: 0,
      newRepo: false,
      language: 'TypeScript',
      topics: [],
    })),
    anomalies: [],
    newRepoClusters: [],
  };
}

function makeCoincident(onchain: Array<{ programId: string; txCount: number }>, dex: Array<{ protocol: string; volume24h: number }>): CoincidentSignals {
  return {
    period: { start: '2026-02-01', end: '2026-02-12' },
    tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
    dexVolumes: {
      total: 0,
      protocols: dex.map(d => ({ ...d, volumeDelta: 0, volumeZScore: 0 })),
    },
    stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
    onchain: onchain.map(s => ({
      ...s,
      programName: 'Test',
      txDelta: 0,
      txZScore: 0,
      uniqueSigners: 0,
    })),
  };
}

function makeConfirming(tokens: Array<{ id: string; volume24h: number }>): ConfirmingSignals {
  return {
    period: { start: '2026-02-01', end: '2026-02-12' },
    tokens: tokens.map(t => ({
      ...t,
      symbol: 'TST',
      name: 'Test',
      price: 1,
      priceDelta7d: 0,
      priceDelta14d: 0,
      volumeDelta: 0,
      volumeZScore: 0,
      marketCap: 0,
      category: 'test',
    })),
    trending: [],
    categoryPerformance: [],
  };
}

function makePreviousReport(overrides: Partial<FortnightlyReport['signals']> = {}): FortnightlyReport {
  return {
    version: '1.0',
    generatedAt: '2026-01-29T00:00:00Z',
    period: { start: '2026-01-15', end: '2026-01-29' },
    sources: [],
    signals: {
      leading: makeLeading([{ repo: 'owner/repo-a', stars: 100, forks: 20, contributors: 5 }]),
      coincident: makeCoincident(
        [{ programId: 'prog1', txCount: 500 }],
        [{ protocol: 'Jupiter', volume24h: 1000000 }],
      ),
      confirming: makeConfirming([{ id: 'sol', volume24h: 500000 }]),
      ...overrides,
    },
    narratives: [],
    buildIdeas: [],
    meta: {
      totalReposAnalyzed: 0, totalProtocolsAnalyzed: 0, totalTokensAnalyzed: 0,
      anomaliesDetected: 0, narrativesIdentified: 0, buildIdeasGenerated: 0,
      llmModel: 'test', llmTokensUsed: 0, llmCostUsd: 0, pipelineDurationMs: 0,
    },
  };
}

describe('applyDeltas', () => {
  it('should no-op when previousReport is null', () => {
    const leading = makeLeading([{ repo: 'owner/repo-a', stars: 150, forks: 25, contributors: 8 }]);
    const coincident = makeCoincident([], []);
    const confirming = makeConfirming([]);

    applyDeltas(leading, coincident, confirming, null);

    expect(leading.repos[0].starsDelta).toBe(0);
    expect(leading.repos[0].forksDelta).toBe(0);
  });

  it('should calculate star, fork, and contributor deltas', () => {
    const leading = makeLeading([{ repo: 'owner/repo-a', stars: 150, forks: 25, contributors: 8 }]);
    const coincident = makeCoincident([], []);
    const confirming = makeConfirming([]);
    const prev = makePreviousReport();

    applyDeltas(leading, coincident, confirming, prev);

    expect(leading.repos[0].starsDelta).toBe(50); // 150 - 100
    expect(leading.repos[0].forksDelta).toBe(5);  // 25 - 20
    expect(leading.repos[0].contributorsDelta).toBe(3); // 8 - 5
  });

  it('should skip repos not in previous report', () => {
    const leading = makeLeading([{ repo: 'owner/new-repo', stars: 10, forks: 2, contributors: 1 }]);
    const coincident = makeCoincident([], []);
    const confirming = makeConfirming([]);
    const prev = makePreviousReport();

    applyDeltas(leading, coincident, confirming, prev);

    expect(leading.repos[0].starsDelta).toBe(0); // unchanged — no prev match
  });

  it('should calculate onchain txDelta', () => {
    const leading = makeLeading([]);
    const coincident = makeCoincident([{ programId: 'prog1', txCount: 750 }], []);
    const confirming = makeConfirming([]);
    const prev = makePreviousReport();

    applyDeltas(leading, coincident, confirming, prev);

    expect(coincident.onchain[0].txDelta).toBe(250); // 750 - 500
  });

  it('should calculate DEX volume percentage deltas', () => {
    const leading = makeLeading([]);
    const coincident = makeCoincident([], [{ protocol: 'Jupiter', volume24h: 1500000 }]);
    const confirming = makeConfirming([]);
    const prev = makePreviousReport();

    applyDeltas(leading, coincident, confirming, prev);

    expect(coincident.dexVolumes.protocols[0].volumeDelta).toBe(50); // +50%
  });

  it('should handle divide-by-zero for DEX volumes', () => {
    const leading = makeLeading([]);
    const coincident = makeCoincident([], [{ protocol: 'NewDEX', volume24h: 100000 }]);
    const confirming = makeConfirming([]);
    // Previous report has Jupiter with 1M, but NewDEX didn't exist
    const prev = makePreviousReport();

    applyDeltas(leading, coincident, confirming, prev);

    expect(coincident.dexVolumes.protocols[0].volumeDelta).toBe(0); // no prev match → stays 0
  });

  it('should guard against zero previous volume', () => {
    const leading = makeLeading([]);
    const coincident = makeCoincident([], [{ protocol: 'Jupiter', volume24h: 500000 }]);
    const confirming = makeConfirming([]);
    const prev = makePreviousReport({
      coincident: makeCoincident([], [{ protocol: 'Jupiter', volume24h: 0 }]),
    });

    applyDeltas(leading, coincident, confirming, prev);

    expect(coincident.dexVolumes.protocols[0].volumeDelta).toBe(0); // guarded
  });

  it('should calculate token volume percentage deltas', () => {
    const leading = makeLeading([]);
    const coincident = makeCoincident([], []);
    const confirming = makeConfirming([{ id: 'sol', volume24h: 750000 }]);
    const prev = makePreviousReport();

    applyDeltas(leading, coincident, confirming, prev);

    expect(confirming.tokens[0].volumeDelta).toBe(50); // (750k - 500k) / 500k * 100
  });

  it('should guard against zero previous token volume', () => {
    const leading = makeLeading([]);
    const coincident = makeCoincident([], []);
    const confirming = makeConfirming([{ id: 'sol', volume24h: 100 }]);
    const prev = makePreviousReport({
      confirming: makeConfirming([{ id: 'sol', volume24h: 0 }]),
    });

    applyDeltas(leading, coincident, confirming, prev);

    expect(confirming.tokens[0].volumeDelta).toBe(0); // guarded
  });
});
