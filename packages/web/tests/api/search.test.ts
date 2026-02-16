import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

vi.mock('@/lib/reports', () => ({
  getAllNarrativesFlat: vi.fn(),
}));

import { getAllNarrativesFlat } from '@/lib/reports';

const mockNarratives = [
  {
    date: '2026-02-14',
    narrative: {
      id: 'n1',
      name: 'DeFi Revival',
      slug: 'defi-revival',
      description: 'DeFi protocols seeing renewed interest',
      stage: 'EMERGING',
      momentum: 'accelerating',
      confidence: 75,
      signals: { leading: [], coincident: [], confirming: [], social: [] },
      relatedRepos: [],
      relatedTokens: [],
      relatedProtocols: [],
    },
  },
  {
    date: '2026-02-14',
    narrative: {
      id: 'n2',
      name: 'NFT Infrastructure',
      slug: 'nft-infrastructure',
      description: 'New NFT tooling emerging',
      stage: 'EARLY',
      momentum: 'stable',
      confidence: 60,
      signals: { leading: [], coincident: [], confirming: [], social: [] },
      relatedRepos: [],
      relatedTokens: [],
      relatedProtocols: [],
    },
  },
];

function makeRequest(params?: string, headers?: Record<string, string>): Request {
  const url = params
    ? `http://localhost/api/search?${params}`
    : 'http://localhost/api/search';
  return new Request(url, {
    headers: { 'x-forwarded-for': '10.0.0.3', ...headers },
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ENABLE_X402;
  delete process.env.X402_RECEIVER_ADDRESS;
  _resetStore();
  vi.mocked(getAllNarrativesFlat).mockResolvedValue(mockNarratives as never);
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

async function getHandler() {
  const mod = await import('@/app/api/search/route');
  return mod.GET;
}

describe('/api/search', () => {
  it('returns 200 with flat narrative list', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].narrative.name).toBe('DeFi Revival');
  });

  it('returns paginated results when ?page= present', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest('page=1&limit=1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination.total).toBe(2);
    expect(body.pagination.pages).toBe(2);
  });

  it('returns raw array when ?page= absent (backward compat)', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('includes rate limit headers', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('59');
  });

  it('returns 429 when rate limited (x402 disabled) — limit is 60', async () => {
    const GET = await getHandler();
    for (let i = 0; i < 60; i++) {
      await GET(makeRequest());
    }
    const res = await GET(makeRequest());
    expect(res.status).toBe(429);
  });

  it('returns 402 when rate limited (x402 enabled)', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    const GET = await getHandler();
    for (let i = 0; i < 60; i++) {
      await GET(makeRequest());
    }
    const res = await GET(makeRequest());
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.accepts[0].resource).toBe('/api/search');
  });

  it('valid payment proof bypasses rate limit', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    const GET = await getHandler();
    for (let i = 0; i < 60; i++) {
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
