import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_MODEL: 'test-model',
    LOG_LEVEL: 'error',
    isDevelopment: false,
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

const mockAnalyzeWithLLM = vi.fn();
vi.mock('../../src/analysis/openrouter.js', () => ({
  analyzeWithLLM: (...args: unknown[]) => mockAnalyzeWithLLM(...args),
  parseLLMJson: (content: string) => {
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    return JSON.parse(cleaned.trim());
  },
}));

import { clusterNarratives } from '../../src/analysis/clustering.js';
import type { GitHubSignals, CoincidentSignals, ConfirmingSignals } from '@solis/shared';

function makeSignals() {
  const leading: GitHubSignals = {
    period: { start: '2026-02-01', end: '2026-02-12' },
    repos: [],
    anomalies: [],
    newRepoClusters: [],
  };
  const coincident: CoincidentSignals = {
    period: { start: '2026-02-01', end: '2026-02-12' },
    tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
    dexVolumes: { total: 0, protocols: [] },
    stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
    onchain: [],
  };
  const confirming: ConfirmingSignals = {
    period: { start: '2026-02-01', end: '2026-02-12' },
    tokens: [],
    trending: [],
    categoryPerformance: [],
  };
  return { leading, coincident, confirming };
}

describe('clusterNarratives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty narratives on LLM failure', async () => {
    mockAnalyzeWithLLM.mockRejectedValue(new Error('LLM unavailable'));

    const result = await clusterNarratives(makeSignals());

    expect(result.narratives).toEqual([]);
    expect(result.tokensUsed).toBe(0);
    expect(result.costUsd).toBe(0);
  });

  it('should return empty narratives on invalid JSON', async () => {
    mockAnalyzeWithLLM.mockResolvedValue({
      content: 'not json at all',
      model: 'test',
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      costUsd: 0,
    });

    const result = await clusterNarratives(makeSignals());

    expect(result.narratives).toEqual([]);
    expect(result.tokensUsed).toBe(0);
  });

  it('should validate and parse valid LLM response', async () => {
    mockAnalyzeWithLLM.mockResolvedValue({
      content: JSON.stringify({
        narratives: [{
          name: 'Solana DePIN',
          description: 'Testing narrative',
          stage: 'EARLY',
          momentum: 'accelerating',
          confidence: 85,
          leading_signals: ['signal 1'],
          coincident_signals: [],
          confirming_signals: [],
          related_repos: ['owner/repo'],
          related_tokens: ['SOL'],
          related_protocols: ['Jupiter'],
        }],
      }),
      model: 'test',
      tokensUsed: { prompt: 100, completion: 200, total: 300 },
      costUsd: 0.001,
    });

    const result = await clusterNarratives(makeSignals());

    expect(result.narratives).toHaveLength(1);
    expect(result.narratives[0].name).toBe('Solana DePIN');
    expect(result.narratives[0].stage).toBe('EARLY');
    expect(result.narratives[0].slug).toBe('solana-depin');
    expect(result.tokensUsed).toBe(300);
    expect(result.costUsd).toBe(0.001);
  });

  it('should handle partial LLM output with missing arrays via Zod defaults', async () => {
    mockAnalyzeWithLLM.mockResolvedValue({
      content: JSON.stringify({
        narratives: [{
          name: 'Minimal',
          description: 'Partial data',
          stage: 'EMERGING',
          momentum: 'stable',
          confidence: 50,
          // Missing all array fields — Zod defaults them to []
        }],
      }),
      model: 'test',
      tokensUsed: { prompt: 50, completion: 50, total: 100 },
      costUsd: 0.0005,
    });

    const result = await clusterNarratives(makeSignals());

    expect(result.narratives).toHaveLength(1);
    expect(result.narratives[0].signals.leading).toEqual([]);
    expect(result.narratives[0].relatedRepos).toEqual([]);
  });

  it('should clamp confidence to 0-100', async () => {
    mockAnalyzeWithLLM.mockResolvedValue({
      content: JSON.stringify({
        narratives: [{
          name: 'Over',
          description: 'test',
          stage: 'EARLY',
          momentum: 'stable',
          confidence: 150,
        }],
      }),
      model: 'test',
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      costUsd: 0,
    });

    const result = await clusterNarratives(makeSignals());
    expect(result.narratives[0].confidence).toBe(100);
  });
});
