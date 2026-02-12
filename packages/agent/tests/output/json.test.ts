import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FortnightlyReport } from '@solis/shared';

const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

vi.mock('../../src/config.js', () => ({
  env: { REPORTS_DIR: '/tmp/solis-reports' },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { writeJsonReport } from '../../src/output/json.js';

function makeReport(): FortnightlyReport {
  return {
    version: '1.0',
    generatedAt: '2026-02-12T00:00:00Z',
    period: { start: '2026-01-29T00:00:00Z', end: '2026-02-12T00:00:00Z' },
    sources: [{ name: 'GitHub', layer: 'LEADING', fetchedAt: '2026-02-12T00:00:00Z', dataPoints: 100 }],
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
    narratives: [],
    buildIdeas: [],
    meta: {
      totalReposAnalyzed: 50,
      totalProtocolsAnalyzed: 20,
      totalTokensAnalyzed: 30,
      anomaliesDetected: 5,
      narrativesIdentified: 3,
      buildIdeasGenerated: 2,
      llmModel: 'test',
      llmTokensUsed: 1000,
      llmCostUsd: 0.01,
      pipelineDurationMs: 5000,
    },
  };
}

describe('writeJsonReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create report directories recursively', async () => {
    await writeJsonReport(makeReport(), '2026-02-12');

    // Root reports dir + signals subdir
    expect(mockMkdir).toHaveBeenCalledWith('/tmp/solis-reports', { recursive: true });
    expect(mockMkdir).toHaveBeenCalledWith('/tmp/solis-reports/signals', { recursive: true });
  });

  it('should write full report JSON to {date}.json', async () => {
    const report = makeReport();
    await writeJsonReport(report, '2026-02-12');

    expect(mockWriteFile).toHaveBeenCalledWith(
      '/tmp/solis-reports/2026-02-12.json',
      JSON.stringify(report, null, 2),
      'utf-8',
    );
  });

  it('should write signals-only extract with correct structure', async () => {
    const report = makeReport();
    await writeJsonReport(report, '2026-02-12');

    const signalsCall = mockWriteFile.mock.calls.find(
      (c: unknown[]) => (c[0] as string).includes('signals/'),
    );
    expect(signalsCall).toBeDefined();

    const written = JSON.parse(signalsCall![1] as string);
    expect(written.date).toBe('2026-02-12');
    expect(written.period).toEqual(report.period);
    expect(written.signals).toEqual(report.signals);
    expect(written.meta.generatedAt).toBe(report.generatedAt);
    expect(written.meta.sources).toEqual(report.sources);
  });

  it('should return the report file path', async () => {
    const result = await writeJsonReport(makeReport(), '2026-02-12');
    expect(result).toBe('/tmp/solis-reports/2026-02-12.json');
  });
});
