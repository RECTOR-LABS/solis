import { describe, it, expect, vi } from 'vitest';
import type { FortnightlyReport, Narrative } from '@solis/shared';

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

function makeNarrative(overrides: Partial<Narrative> = {}): Narrative {
  return {
    id: 'n-1',
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

function makeReport(narratives: Narrative[]): FortnightlyReport {
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    period: { start: '', end: '' },
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
    narratives,
    buildIdeas: [],
    meta: {
      totalReposAnalyzed: 0,
      totalProtocolsAnalyzed: 0,
      totalTokensAnalyzed: 0,
      anomaliesDetected: 0,
      narrativesIdentified: narratives.length,
      buildIdeasGenerated: 0,
      llmModel: 'test',
      llmTokensUsed: 0,
      llmCostUsd: 0,
      pipelineDurationMs: 0,
    },
  };
}

describe('Confidence Calibration', () => {
  it('should handle single report (insufficient data)', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const result = computeCalibration([
      { date: '2026-02-14', report: makeReport([makeNarrative()]) },
    ]);

    expect(result.reportCount).toBe(1);
    expect(result.brierScore).toBe(0);
    expect(result.overallPersistenceRate).toBe(0);
  });

  it('should handle empty reports array', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const result = computeCalibration([]);
    expect(result.reportCount).toBe(0);
    expect(result.brierScore).toBe(0);
  });

  it('should detect persistence across two reports', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const narrative = makeNarrative({ slug: 'depin', name: 'DePIN', confidence: 85 });

    const result = computeCalibration([
      { date: '2026-02-13', report: makeReport([narrative]) },
      { date: '2026-02-14', report: makeReport([narrative]) },
    ]);

    expect(result.overallPersistenceRate).toBe(1);
    expect(result.reportCount).toBe(2);
  });

  it('should detect non-persistence', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const result = computeCalibration([
      { date: '2026-02-13', report: makeReport([makeNarrative({ slug: 'alpha', name: 'Alpha' })]) },
      { date: '2026-02-14', report: makeReport([makeNarrative({ slug: 'beta', name: 'Beta' })]) },
    ]);

    expect(result.overallPersistenceRate).toBe(0);
  });

  it('should bucket narratives by confidence', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const result = computeCalibration([
      {
        date: '2026-02-13',
        report: makeReport([
          makeNarrative({ slug: 'high', name: 'High Confidence', confidence: 85 }),
          makeNarrative({ slug: 'low', name: 'Low Confidence', confidence: 25 }),
        ]),
      },
      {
        date: '2026-02-14',
        report: makeReport([
          makeNarrative({ slug: 'high', name: 'High Confidence', confidence: 90 }),
          // 'low' doesn't persist
        ]),
      },
    ]);

    // 80-90 bucket should have 1 total, 1 persisted
    const highBucket = result.buckets.find(b => b.range[0] === 80);
    expect(highBucket?.total).toBe(1);
    expect(highBucket?.persisted).toBe(1);

    // 20-30 bucket should have 1 total, 0 persisted
    const lowBucket = result.buckets.find(b => b.range[0] === 20);
    expect(lowBucket?.total).toBe(1);
    expect(lowBucket?.persisted).toBe(0);
  });

  it('should compute Brier score for perfect calibration', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    // 100% confidence narrative that persists — Brier = (1.0 - 1)^2 = 0
    const result = computeCalibration([
      { date: '2026-02-13', report: makeReport([makeNarrative({ slug: 'sure', name: 'Sure Thing', confidence: 100 })]) },
      { date: '2026-02-14', report: makeReport([makeNarrative({ slug: 'sure', name: 'Sure Thing', confidence: 100 })]) },
    ]);

    expect(result.brierScore).toBe(0);
  });

  it('should compute Brier score for worst calibration', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    // 100% confidence narrative that doesn't persist — Brier = (1.0 - 0)^2 = 1
    const result = computeCalibration([
      { date: '2026-02-13', report: makeReport([makeNarrative({ slug: 'wrong', name: 'Wrong Prediction', confidence: 100 })]) },
      { date: '2026-02-14', report: makeReport([makeNarrative({ slug: 'different', name: 'Different Narrative' })]) },
    ]);

    expect(result.brierScore).toBe(1);
  });

  it('should compute Brier score for moderate calibration', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    // 50% confidence narrative that persists — Brier = (0.5 - 1)^2 = 0.25
    const result = computeCalibration([
      { date: '2026-02-13', report: makeReport([makeNarrative({ slug: 'maybe', name: 'Maybe Narrative', confidence: 50 })]) },
      { date: '2026-02-14', report: makeReport([makeNarrative({ slug: 'maybe', name: 'Maybe Narrative' })]) },
    ]);

    expect(result.brierScore).toBeCloseTo(0.25);
  });

  it('should have 10 buckets covering 0-100', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const result = computeCalibration([]);
    expect(result.buckets).toHaveLength(10);
    expect(result.buckets[0].range).toEqual([0, 10]);
    expect(result.buckets[9].range).toEqual([90, 100]);
  });

  it('should track stage advancement', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const result = computeCalibration([
      {
        date: '2026-02-13',
        report: makeReport([
          makeNarrative({ slug: 'growth', name: 'Growth', confidence: 75, stage: 'EMERGING', momentum: 'accelerating' }),
        ]),
      },
      {
        date: '2026-02-14',
        report: makeReport([
          makeNarrative({ slug: 'growth', name: 'Growth', confidence: 80, stage: 'GROWING' }),
        ]),
      },
    ]);

    const bucket = result.buckets.find(b => b.range[0] === 70);
    expect(bucket?.stageAdvanced).toBe(1);
  });

  it('should handle multiple consecutive report pairs', async () => {
    const { computeCalibration } = await import('../../src/eval/calibration.js');

    const persistent = makeNarrative({ slug: 'persistent', name: 'Persistent', confidence: 80 });

    const result = computeCalibration([
      { date: '2026-02-12', report: makeReport([persistent]) },
      { date: '2026-02-13', report: makeReport([persistent]) },
      { date: '2026-02-14', report: makeReport([persistent]) },
    ]);

    // persistent appears in reports 0→1 and 1→2, so 2 total, 2 persisted
    expect(result.overallPersistenceRate).toBe(1);
    const bucket = result.buckets.find(b => b.range[0] === 80);
    expect(bucket?.total).toBe(2);
    expect(bucket?.persisted).toBe(2);
  });
});
