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

import { generateBuildIdeas } from '../../src/analysis/ideas.js';
import type { Narrative } from '@solis/shared';

function makeNarratives(): Narrative[] {
  return [{
    id: 'n-1',
    name: 'Solana DePIN',
    slug: 'solana-depin',
    description: 'Test narrative',
    stage: 'EARLY',
    momentum: 'accelerating',
    confidence: 85,
    signals: { leading: [], coincident: [], confirming: [] },
    relatedRepos: [],
    relatedTokens: [],
    relatedProtocols: [],
  }];
}

describe('generateBuildIdeas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty ideas when narratives is empty', async () => {
    const result = await generateBuildIdeas([]);
    expect(result.ideas).toEqual([]);
    expect(result.tokensUsed).toBe(0);
    expect(mockAnalyzeWithLLM).not.toHaveBeenCalled();
  });

  it('should return empty ideas on LLM failure', async () => {
    mockAnalyzeWithLLM.mockRejectedValue(new Error('LLM down'));

    const result = await generateBuildIdeas(makeNarratives());

    expect(result.ideas).toEqual([]);
    expect(result.tokensUsed).toBe(0);
    expect(result.costUsd).toBe(0);
  });

  it('should return empty ideas on invalid JSON', async () => {
    mockAnalyzeWithLLM.mockResolvedValue({
      content: 'garbage',
      model: 'test',
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      costUsd: 0,
    });

    const result = await generateBuildIdeas(makeNarratives());

    expect(result.ideas).toEqual([]);
  });

  it('should parse valid LLM response', async () => {
    mockAnalyzeWithLLM.mockResolvedValue({
      content: JSON.stringify({
        ideas: [{
          title: 'DePIN Dashboard',
          narrative: 'Solana DePIN',
          description: 'Real-time DePIN metrics',
          difficulty: 'intermediate',
          timeframe: '2-4 weeks',
          tech_stack: ['Next.js', 'Helius'],
          existing_projects: ['helium-explorer'],
          why_now: 'DePIN growth accelerating',
        }],
      }),
      model: 'test',
      tokensUsed: { prompt: 100, completion: 200, total: 300 },
      costUsd: 0.002,
    });

    const result = await generateBuildIdeas(makeNarratives());

    expect(result.ideas).toHaveLength(1);
    expect(result.ideas[0].title).toBe('DePIN Dashboard');
    expect(result.ideas[0].narrative).toBe('n-1'); // mapped from name to ID
    expect(result.ideas[0].difficulty).toBe('intermediate');
    expect(result.tokensUsed).toBe(300);
  });

  it('should default invalid difficulty to intermediate', async () => {
    mockAnalyzeWithLLM.mockResolvedValue({
      content: JSON.stringify({
        ideas: [{
          title: 'Test',
          narrative: 'Unknown',
          description: 'test',
          difficulty: 'expert', // invalid
          timeframe: '1 month',
          why_now: 'test',
        }],
      }),
      model: 'test',
      tokensUsed: { prompt: 0, completion: 0, total: 0 },
      costUsd: 0,
    });

    const result = await generateBuildIdeas(makeNarratives());
    expect(result.ideas[0].difficulty).toBe('intermediate');
  });
});
