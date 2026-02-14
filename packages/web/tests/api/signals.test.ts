import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

import { readFile } from 'node:fs/promises';

const mockSignals = {
  leading: { repos: [{ repo: 'solana-labs/solana', stars: 12000 }] },
  coincident: { tvl: { total: 5_000_000_000 } },
  confirming: { tokens: [{ symbol: 'SOL', price: 120 }] },
};

function makeRequest(params?: string, headers?: Record<string, string>): Request {
  const url = params
    ? `http://localhost/api/signals?${params}`
    : 'http://localhost/api/signals';
  return new Request(url, {
    headers: { 'x-forwarded-for': '10.0.0.2', ...headers },
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ENABLE_X402;
  delete process.env.X402_RECEIVER_ADDRESS;
  _resetStore();
  vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockSignals));
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

async function getHandler() {
  const mod = await import('@/app/api/signals/route');
  return mod.GET;
}

describe('/api/signals', () => {
  it('returns 400 when date missing', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('date');
  });

  it('returns 200 with signal data for valid date', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest('date=2026-02-14'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leading.repos).toHaveLength(1);
  });

  it('returns 404 for unknown date', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));
    const GET = await getHandler();
    const res = await GET(makeRequest('date=1999-01-01'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('not found');
  });

  it('returns 429 when rate limited (x402 disabled)', async () => {
    const GET = await getHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeRequest('date=2026-02-14'));
    }
    const res = await GET(makeRequest('date=2026-02-14'));
    expect(res.status).toBe(429);
  });

  it('returns 402 when rate limited (x402 enabled)', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    const GET = await getHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeRequest('date=2026-02-14'));
    }
    const res = await GET(makeRequest('date=2026-02-14'));
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts[0].resource).toBe('/api/signals');
  });

  it('valid payment proof bypasses rate limit', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    const GET = await getHandler();
    for (let i = 0; i < 30; i++) {
      await GET(makeRequest('date=2026-02-14'));
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

    const res = await GET(makeRequest('date=2026-02-14', { 'x-payment': proof }));
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
    const res = await GET(makeRequest('date=2026-02-14', { 'x-payment': proof }));
    expect(res.status).toBe(401);
  });
});
