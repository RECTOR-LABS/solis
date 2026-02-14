import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

// Mock reports — bare fns, implementations set in beforeEach
vi.mock('@/lib/reports', () => ({
  getReportSummaries: vi.fn(),
  getReport: vi.fn(),
  getLatestReport: vi.fn(),
}));

// Mock openrouter — bare fn, implementation set in beforeEach
vi.mock('@/lib/openrouter', () => ({
  queryLLM: vi.fn(),
}));

import { getReportSummaries, getReport, getLatestReport } from '@/lib/reports';
import { queryLLM } from '@/lib/openrouter';

const mockSummaries = [
  { date: '2026-02-14', narrativeCount: 8, buildIdeaCount: 3 },
];

const mockReport = {
  generatedAt: '2026-02-14T08:00:00Z',
  period: { start: '2026-01-31', end: '2026-02-14' },
  narratives: [
    {
      id: 'n1', name: 'Test', slug: 'test', description: 'test',
      stage: 'EMERGING', momentum: 'accelerating', confidence: 75,
      signals: { leading: ['s1'], coincident: [], confirming: [], social: [] },
      relatedRepos: [], relatedTokens: [], relatedProtocols: [],
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
    totalReposAnalyzed: 100, totalProtocolsAnalyzed: 50, totalTokensAnalyzed: 20,
    anomaliesDetected: 5, narrativesIdentified: 8, buildIdeasGenerated: 3,
    llmModel: 'test', llmTokensUsed: 1000, llmCostUsd: 0.01, pipelineDurationMs: 5000,
  },
};

function makeReportsRequest(ip: string, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/reports', {
    headers: { 'x-forwarded-for': ip, ...headers },
  });
}

function makeQueryRequest(ip: string, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      ...headers,
    },
    body: JSON.stringify({ question: 'What is trending?' }),
  });
}

function buildProof(tx = 'test-tx-sig'): string {
  return btoa(JSON.stringify({
    x402Version: 1,
    scheme: 'exact',
    network: 'solana-mainnet',
    payload: { tx },
  }));
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.ENABLE_X402 = 'true';
  process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';
  process.env.X402_PRICE_CENTS = '1';
  _resetStore();
  vi.mocked(getReportSummaries).mockResolvedValue(mockSummaries as never);
  vi.mocked(getReport).mockResolvedValue(null);
  vi.mocked(getLatestReport).mockResolvedValue(mockReport as never);
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

async function getReportsHandler() {
  const mod = await import('@/app/api/reports/route');
  return mod.GET;
}

async function getQueryHandler() {
  const mod = await import('@/app/api/query/route');
  return mod.POST;
}

describe('x402 payment flow (e2e)', () => {
  it('full cycle: exhaust limit → 402 → extract details → pay → 200', async () => {
    const GET = await getReportsHandler();

    // Exhaust the rate limit (30 requests for /api/reports)
    for (let i = 0; i < 30; i++) {
      const res = await GET(makeReportsRequest('192.168.1.1'));
      expect(res.status).toBe(200);
    }

    // Next request should be 402
    const blockedRes = await GET(makeReportsRequest('192.168.1.1'));
    expect(blockedRes.status).toBe(402);

    // Extract payment details from 402 body
    const body = await blockedRes.json();
    const accept = body.accepts[0];
    expect(accept.scheme).toBe('exact');
    expect(accept.network).toBe('solana-mainnet');
    expect(accept.payTo).toBe('SoLANAaddr123');

    // Mock facilitator to accept payment
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: true }),
    }));

    // Retry with payment proof → should succeed
    const paidRes = await GET(makeReportsRequest('192.168.1.1', {
      'x-payment': buildProof(),
    }));
    expect(paidRes.status).toBe(200);
  });

  it('402 response contains valid x402 v1 structure', async () => {
    const GET = await getReportsHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeReportsRequest('192.168.2.1'));
    }

    const res = await GET(makeReportsRequest('192.168.2.1'));
    const body = await res.json();

    expect(body.x402Version).toBe(1);
    expect(body.accepts).toBeInstanceOf(Array);
    expect(body.accepts).toHaveLength(1);

    const accept = body.accepts[0];
    expect(accept).toHaveProperty('scheme', 'exact');
    expect(accept).toHaveProperty('network', 'solana-mainnet');
    expect(accept).toHaveProperty('maxAmountRequired');
    expect(accept).toHaveProperty('resource');
    expect(accept).toHaveProperty('payTo');
    expect(accept).toHaveProperty('maxTimeoutSeconds');
    expect(accept).toHaveProperty('asset', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });

  it('402 amount matches route priceCents (10000 for $0.01)', async () => {
    const GET = await getReportsHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeReportsRequest('192.168.3.1'));
    }

    const res = await GET(makeReportsRequest('192.168.3.1'));
    const body = await res.json();
    // 1 cent = 10000 USDC base units (6 decimals)
    expect(body.accepts[0].maxAmountRequired).toBe('10000');
  });

  it('query route 402 amount is 50000 ($0.05 override)', async () => {
    const POST = await getQueryHandler();
    // Query route has limit=5
    for (let i = 0; i < 5; i++) {
      await POST(makeQueryRequest('192.168.4.1'));
    }

    const res = await POST(makeQueryRequest('192.168.4.1'));
    expect(res.status).toBe(402);
    const body = await res.json();
    // 5 cents = 50000 USDC base units
    expect(body.accepts[0].maxAmountRequired).toBe('50000');
    expect(body.accepts[0].resource).toBe('/api/query');
  });

  it('payment proof ignored when ENABLE_X402=false (still 429)', async () => {
    process.env.ENABLE_X402 = 'false';

    const GET = await getReportsHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeReportsRequest('192.168.5.1'));
    }

    // Even with payment proof, should get 429 (not 402, not 200)
    const res = await GET(makeReportsRequest('192.168.5.1', {
      'x-payment': buildProof(),
    }));
    expect(res.status).toBe(429);
  });

  it('facilitator timeout returns 401 (not 500)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ETIMEDOUT')));

    const GET = await getReportsHandler();
    const res = await GET(makeReportsRequest('192.168.6.1', {
      'x-payment': buildProof(),
    }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('ETIMEDOUT');
  });

  it('concurrent IPs: one rate-limited, another still free', async () => {
    const GET = await getReportsHandler();

    // IP A exhausts their limit
    for (let i = 0; i < 30; i++) {
      await GET(makeReportsRequest('10.0.0.100'));
    }
    const blockedRes = await GET(makeReportsRequest('10.0.0.100'));
    expect(blockedRes.status).toBe(402);

    // IP B is still free
    const freeRes = await GET(makeReportsRequest('10.0.0.200'));
    expect(freeRes.status).toBe(200);
  });

  it('rate limit headers on 402 response match exhausted state', async () => {
    const GET = await getReportsHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeReportsRequest('192.168.8.1'));
    }

    const res = await GET(makeReportsRequest('192.168.8.1'));
    expect(res.status).toBe(402);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });
});
