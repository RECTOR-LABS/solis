import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

vi.mock('@/lib/reports', () => ({
  getReportSummaries: vi.fn(),
  getReport: vi.fn(),
}));

import { getReportSummaries, getReport } from '@/lib/reports';

const mockSummaries = [
  {
    date: '2026-02-14',
    generatedAt: '2026-02-14T08:00:00Z',
    period: { start: '2026-01-31', end: '2026-02-14' },
    narrativeCount: 8,
    topNarratives: [{ name: 'DeFi Revival', stage: 'EMERGING', momentum: 'accelerating' }],
    buildIdeaCount: 3,
  },
];

const mockReport = {
  generatedAt: '2026-02-14T08:00:00Z',
  period: { start: '2026-01-31', end: '2026-02-14' },
  narratives: [{ id: 'n1', name: 'DeFi Revival', stage: 'EMERGING', confidence: 75 }],
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

function makeRequest(params?: string, headers?: Record<string, string>): Request {
  const url = params
    ? `http://localhost/api/reports?${params}`
    : 'http://localhost/api/reports';
  return new Request(url, {
    headers: { 'x-forwarded-for': '10.0.0.1', ...headers },
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ENABLE_X402;
  delete process.env.X402_RECEIVER_ADDRESS;
  _resetStore();
  vi.mocked(getReportSummaries).mockResolvedValue(mockSummaries as never);
  vi.mocked(getReport).mockResolvedValue(mockReport as never);
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

async function getHandler() {
  const mod = await import('@/app/api/reports/route');
  return mod.GET;
}

describe('/api/reports', () => {
  it('returns 200 with report summaries', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockSummaries);
  });

  it('returns 200 with full report for ?date=', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest('date=2026-02-14'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.generatedAt).toBe('2026-02-14T08:00:00Z');
    expect(getReport).toHaveBeenCalledWith('2026-02-14');
  });

  it('returns 404 for unknown date', async () => {
    vi.mocked(getReport).mockResolvedValue(null);
    const GET = await getHandler();
    const res = await GET(makeRequest('date=1999-01-01'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('includes rate limit headers on success', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('29');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('returns 429 when rate limited (x402 disabled)', async () => {
    const GET = await getHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeRequest());
    }
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain('Rate limit');
  });

  it('returns 402 when rate limited (x402 enabled)', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    const GET = await getHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeRequest());
    }
    const res = await GET(makeRequest());
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts).toHaveLength(1);
  });

  it('402 body has correct pricing (1 cent = 10000 base units)', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';
    process.env.X402_PRICE_CENTS = '1';

    const GET = await getHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeRequest());
    }
    const res = await GET(makeRequest());
    const body = await res.json();
    expect(body.accepts[0].maxAmountRequired).toBe('10000');
    expect(body.accepts[0].resource).toBe('/api/reports');
    expect(body.accepts[0].payTo).toBe('SoLANAaddr123');
  });

  it('valid payment proof bypasses rate limit', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    const GET = await getHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeRequest());
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: true }),
    }));

    const proof = btoa(JSON.stringify({
      x402Version: 1,
      scheme: 'exact',
      network: 'solana-mainnet',
      payload: { tx: 'test-tx-sig' },
    }));

    const res = await GET(makeRequest(undefined, { 'x-payment': proof }));
    expect(res.status).toBe(200);
  });

  it('invalid payment proof returns 401', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: false }),
    }));

    const proof = btoa(JSON.stringify({
      x402Version: 1,
      scheme: 'exact',
      network: 'solana-mainnet',
      payload: { tx: 'invalid' },
    }));

    const GET = await getHandler();
    const res = await GET(makeRequest(undefined, { 'x-payment': proof }));
    expect(res.status).toBe(401);
  });
});
