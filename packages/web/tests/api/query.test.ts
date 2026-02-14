import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

// Mock reports
vi.mock('@/lib/reports', () => ({
  getLatestReport: vi.fn(),
  getReport: vi.fn(),
}));

// Mock openrouter
vi.mock('@/lib/openrouter', () => ({
  queryLLM: vi.fn(),
}));

import { getLatestReport, getReport } from '@/lib/reports';
import { queryLLM } from '@/lib/openrouter';

const mockReport = {
  generatedAt: '2026-02-14T08:00:00Z',
  period: { start: '2026-01-31', end: '2026-02-14' },
  narratives: [
    {
      id: 'n1',
      name: 'Test Narrative',
      slug: 'test-narrative',
      description: 'A test narrative',
      stage: 'EMERGING',
      momentum: 'accelerating',
      confidence: 75,
      signals: { leading: ['sig1'], coincident: [], confirming: [], social: [] },
      relatedRepos: [],
      relatedTokens: [],
      relatedProtocols: [],
    },
  ],
  buildIdeas: [],
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
  sources: [],
  meta: {
    totalReposAnalyzed: 100,
    totalProtocolsAnalyzed: 50,
    totalTokensAnalyzed: 20,
    anomaliesDetected: 5,
    narrativesIdentified: 8,
    buildIdeasGenerated: 3,
    llmModel: 'test',
    llmTokensUsed: 1000,
    llmCostUsd: 0.01,
    pipelineDurationMs: 5000,
  },
};

function makeRequest(body?: object): Request {
  return new Request('http://localhost/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ENABLE_X402;
  _resetStore();
  vi.mocked(getLatestReport).mockResolvedValue(mockReport as never);
  vi.mocked(getReport).mockResolvedValue(mockReport as never);
  vi.mocked(queryLLM).mockResolvedValue({
    content: 'Test answer',
    model: 'test-model',
    tokensUsed: 100,
    costUsd: 0.001,
  });
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

// Dynamic import to apply mocks
async function getHandler() {
  const mod = await import('@/app/api/query/route');
  return mod.POST;
}

describe('/api/query', () => {
  it('returns 400 for missing question', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('required');
  });

  it('returns 400 for empty question', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ question: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for question over 500 chars', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ question: 'x'.repeat(501) }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('500');
  });

  it('returns QueryResponse for valid request', async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ question: 'What is trending?' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.answer).toBe('Test answer');
    expect(body.model).toBe('test-model');
    expect(body.tokensUsed).toBe(100);
    expect(body.reportDate).toBe('2026-02-14');
    expect(body.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns 404 when no report found for date', async () => {
    vi.mocked(getReport).mockResolvedValue(null);
    const POST = await getHandler();
    const res = await POST(makeRequest({ question: 'test?', reportDate: '2020-01-01' }));
    expect(res.status).toBe(404);
  });

  it('returns 429 when rate limited', async () => {
    const POST = await getHandler();
    // 5 requests allowed
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ question: 'test?' }));
    }
    const res = await POST(makeRequest({ question: 'test?' }));
    expect(res.status).toBe(429);
  });

  it('returns 502 when LLM call fails', async () => {
    vi.mocked(queryLLM).mockRejectedValue(new Error('API down'));
    const POST = await getHandler();
    const res = await POST(makeRequest({ question: 'test?' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain('API down');
  });

  it('uses specific report date when provided', async () => {
    const POST = await getHandler();
    await POST(makeRequest({ question: 'test?', reportDate: '2026-02-10' }));
    expect(getReport).toHaveBeenCalledWith('2026-02-10');
  });
});
