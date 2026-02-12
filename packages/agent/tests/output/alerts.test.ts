import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    ALERTS_ENABLED: true,
    ALERT_CHANNEL: 'telegram',
    TELEGRAM_BOT_TOKEN: 'test-token',
    TELEGRAM_CHAT_ID: '123456',
    DISCORD_WEBHOOK_URL: '',
    ALERT_ANOMALY_THRESHOLD: 3.0,
    LOG_LEVEL: 'error',
  },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { detectAlerts, formatFailureMessage } from '../../src/output/alerts.js';
import type { FortnightlyReport, Narrative } from '@solis/shared';

function makeNarrative(overrides: Partial<Narrative> = {}): Narrative {
  return {
    id: 'n-1',
    name: 'Test Narrative',
    slug: 'test-narrative',
    description: 'A test',
    stage: 'EMERGING',
    momentum: 'stable',
    confidence: 75,
    signals: { leading: [], coincident: [], confirming: [] },
    relatedRepos: [],
    relatedTokens: [],
    relatedProtocols: [],
    ...overrides,
  };
}

function makeReport(overrides: Partial<FortnightlyReport> = {}): FortnightlyReport {
  return {
    version: '1.0',
    generatedAt: '2026-02-12T08:00:00Z',
    period: { start: '2026-01-29T08:00:00Z', end: '2026-02-12T08:00:00Z' },
    sources: [],
    signals: {
      leading: { period: { start: '', end: '' }, repos: [], anomalies: [], newRepoClusters: [] },
      coincident: {
        period: { start: '', end: '' },
        tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
        dexVolumes: { total: 0, protocols: [] },
        stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
        onchain: [],
      },
      confirming: { period: { start: '', end: '' }, tokens: [], trending: [], categoryPerformance: [] },
    },
    narratives: [makeNarrative()],
    buildIdeas: [],
    meta: {
      totalReposAnalyzed: 50,
      totalProtocolsAnalyzed: 20,
      totalTokensAnalyzed: 30,
      anomaliesDetected: 5,
      narrativesIdentified: 1,
      buildIdeasGenerated: 0,
      llmModel: 'test',
      llmTokensUsed: 1000,
      llmCostUsd: 0.01,
      pipelineDurationMs: 5000,
    },
    ...overrides,
  };
}

describe('detectAlerts', () => {
  it('returns empty alerts when no diff and no anomalies', () => {
    const report = makeReport();
    const alerts = detectAlerts(report);
    expect(alerts).toEqual([]);
  });

  it('detects stage transitions as high severity', () => {
    const report = makeReport({
      diff: {
        newNarratives: [],
        removedNarratives: [],
        stageTransitions: [{ name: 'DePIN', from: 'EARLY', to: 'EMERGING' }],
        confidenceChanges: [],
      },
    });

    const alerts = detectAlerts(report);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('high');
    expect(alerts[0].message).toContain('DePIN');
    expect(alerts[0].message).toContain('EARLY → EMERGING');
  });

  it('detects new narratives as medium severity', () => {
    const report = makeReport({
      narratives: [makeNarrative({ name: 'New Thing', stage: 'EARLY', confidence: 80 })],
      diff: {
        newNarratives: ['New Thing'],
        removedNarratives: [],
        stageTransitions: [],
        confidenceChanges: [],
      },
    });

    const alerts = detectAlerts(report);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('medium');
    expect(alerts[0].message).toContain('New Thing');
    expect(alerts[0].message).toContain('EARLY');
  });

  it('detects removed narratives as low severity', () => {
    const report = makeReport({
      diff: {
        newNarratives: [],
        removedNarratives: ['Old Thing'],
        stageTransitions: [],
        confidenceChanges: [],
      },
    });

    const alerts = detectAlerts(report);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('low');
    expect(alerts[0].message).toContain('Old Thing');
  });

  it('detects anomaly spikes above threshold', () => {
    const report = makeReport({
      signals: {
        leading: {
          period: { start: '', end: '' },
          repos: [],
          anomalies: [{
            repo: 'test/repo',
            stars: 100, starsDelta: 50, starsZScore: 3.5,
            commits: 200, commitsDelta: 100, commitsZScore: 1.0,
            forks: 10, forksDelta: 5, forksZScore: 0.5,
            contributors: 5, contributorsDelta: 2,
            newRepo: false, language: 'TypeScript', topics: [],
          }],
          newRepoClusters: [],
        },
        coincident: {
          period: { start: '', end: '' },
          tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
          dexVolumes: { total: 0, protocols: [] },
          stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
          onchain: [],
        },
        confirming: { period: { start: '', end: '' }, tokens: [], trending: [], categoryPerformance: [] },
      },
    });

    const alerts = detectAlerts(report);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('test/repo');
    expect(alerts[0].message).toContain('3.50');
  });

  it('ignores anomalies below threshold', () => {
    const report = makeReport({
      signals: {
        leading: {
          period: { start: '', end: '' },
          repos: [],
          anomalies: [{
            repo: 'test/repo',
            stars: 100, starsDelta: 50, starsZScore: 2.5,
            commits: 200, commitsDelta: 100, commitsZScore: 2.0,
            forks: 10, forksDelta: 5, forksZScore: 0.5,
            contributors: 5, contributorsDelta: 2,
            newRepo: false, language: 'TypeScript', topics: [],
          }],
          newRepoClusters: [],
        },
        coincident: {
          period: { start: '', end: '' },
          tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
          dexVolumes: { total: 0, protocols: [] },
          stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
          onchain: [],
        },
        confirming: { period: { start: '', end: '' }, tokens: [], trending: [], categoryPerformance: [] },
      },
    });

    const alerts = detectAlerts(report);
    expect(alerts).toEqual([]);
  });
});

describe('formatFailureMessage', () => {
  it('formats a failure message', () => {
    const message = formatFailureMessage('Connection timeout');
    expect(message).toContain('Pipeline Failed');
    expect(message).toContain('Connection timeout');
  });
});
