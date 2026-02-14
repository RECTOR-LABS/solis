import { describe, it, expect, vi } from 'vitest';
import type { Narrative } from '@solis/shared';

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

describe('LLM Comparison', () => {
  it('should compute perfect overlap for identical narratives', async () => {
    const { computeComparison } = await import('../../src/eval/llm-compare.js');

    const narratives = [
      makeNarrative({ slug: 'depin', name: 'DePIN', confidence: 80, stage: 'GROWING' }),
      makeNarrative({ slug: 'defi', name: 'DeFi', confidence: 60, stage: 'EMERGING' }),
    ];

    const a = { model: 'model-a', narratives, tokensUsed: 1000, costUsd: 0.01, latencyMs: 500 };
    const b = { model: 'model-b', narratives, tokensUsed: 1000, costUsd: 0.01, latencyMs: 500 };

    const result = computeComparison(a, b);

    expect(result.narrativeOverlap).toBe(1);
    expect(result.stageAgreement).toBe(1);
    expect(result.avgConfidenceDelta).toBe(0);
    expect(result.uniqueToA).toEqual([]);
    expect(result.uniqueToB).toEqual([]);
  });

  it('should detect zero overlap for disjoint narratives', async () => {
    const { computeComparison } = await import('../../src/eval/llm-compare.js');

    const a = {
      model: 'model-a',
      narratives: [makeNarrative({ slug: 'depin', name: 'DePIN' })],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };
    const b = {
      model: 'model-b',
      narratives: [makeNarrative({ slug: 'gaming', name: 'Gaming' })],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };

    const result = computeComparison(a, b);

    expect(result.narrativeOverlap).toBe(0);
    expect(result.uniqueToA).toEqual(['DePIN']);
    expect(result.uniqueToB).toEqual(['Gaming']);
  });

  it('should compute partial overlap correctly', async () => {
    const { computeComparison } = await import('../../src/eval/llm-compare.js');

    const shared = makeNarrative({ slug: 'depin', name: 'DePIN', confidence: 80, stage: 'GROWING' });

    const a = {
      model: 'model-a',
      narratives: [
        shared,
        makeNarrative({ slug: 'ai-agents', name: 'AI Agents' }),
      ],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };
    const b = {
      model: 'model-b',
      narratives: [
        { ...shared, confidence: 70 }, // same slug, different confidence
        makeNarrative({ slug: 'memecoins', name: 'Memecoins' }),
      ],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };

    const result = computeComparison(a, b);

    // 1 overlap / 3 unique slugs = ~0.333
    expect(result.narrativeOverlap).toBeCloseTo(1 / 3);
    expect(result.avgConfidenceDelta).toBe(10);
    expect(result.uniqueToA).toEqual(['AI Agents']);
    expect(result.uniqueToB).toEqual(['Memecoins']);
  });

  it('should compute stage agreement among matched pairs', async () => {
    const { computeComparison } = await import('../../src/eval/llm-compare.js');

    const a = {
      model: 'model-a',
      narratives: [
        makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'GROWING' }),
        makeNarrative({ slug: 'defi', name: 'DeFi', stage: 'EMERGING' }),
      ],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };
    const b = {
      model: 'model-b',
      narratives: [
        makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'GROWING' }), // agree
        makeNarrative({ slug: 'defi', name: 'DeFi', stage: 'EARLY' }), // disagree
      ],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };

    const result = computeComparison(a, b);
    expect(result.stageAgreement).toBe(0.5);
  });

  it('should handle empty narratives from both models', async () => {
    const { computeComparison } = await import('../../src/eval/llm-compare.js');

    const a = { model: 'model-a', narratives: [], tokensUsed: 0, costUsd: 0, latencyMs: 100 };
    const b = { model: 'model-b', narratives: [], tokensUsed: 0, costUsd: 0, latencyMs: 100 };

    const result = computeComparison(a, b);

    expect(result.narrativeOverlap).toBe(0);
    expect(result.stageAgreement).toBe(0);
    expect(result.avgConfidenceDelta).toBe(0);
  });

  it('should handle fuzzy name matching across models', async () => {
    const { computeComparison } = await import('../../src/eval/llm-compare.js');

    const a = {
      model: 'model-a',
      narratives: [makeNarrative({ slug: 'solana-depin-expansion', name: 'Solana DePIN Expansion' })],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };
    const b = {
      model: 'model-b',
      narratives: [makeNarrative({ slug: 'depin-expansion', name: 'DePIN Expansion' })],
      tokensUsed: 1000, costUsd: 0.01, latencyMs: 500,
    };

    const result = computeComparison(a, b);

    // "Solana" is stripped by normalize(), so these should match via fuzzy
    expect(result.narrativeOverlap).toBeGreaterThan(0);
  });
});
