import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiGuard, getGuardHeaders } from '@/lib/api-guard';
import { _resetStore } from '@/lib/rate-limit';

const ORIGINAL_ENV = { ...process.env };

const guardConfig = { limit: 2, resource: '/api/test' };

function makeRequest(headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/test', {
    headers: { 'x-forwarded-for': '1.2.3.4', ...headers },
  });
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.ENABLE_X402;
  delete process.env.X402_RECEIVER_ADDRESS;
  _resetStore();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe('apiGuard', () => {
  it('allows requests under the rate limit', async () => {
    const req = makeRequest();
    const result = await apiGuard(req, guardConfig);
    expect(result).toBeNull();
  });

  it('stashes rate limit headers on allowed requests', async () => {
    const req = makeRequest();
    await apiGuard(req, guardConfig);
    const headers = getGuardHeaders(req);
    expect(headers['X-RateLimit-Limit']).toBe('2');
    expect(headers['X-RateLimit-Remaining']).toBe('1');
  });

  it('returns 429 when rate limit exceeded (x402 disabled)', async () => {
    await apiGuard(makeRequest(), guardConfig);
    await apiGuard(makeRequest(), guardConfig);
    const result = await apiGuard(makeRequest(), guardConfig);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    const body = await result!.json();
    expect(body.error).toContain('Rate limit');
  });

  it('returns 402 when rate limit exceeded and x402 enabled', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    await apiGuard(makeRequest(), guardConfig);
    await apiGuard(makeRequest(), guardConfig);
    const result = await apiGuard(makeRequest(), guardConfig);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(402);
    const body = await result!.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts).toHaveLength(1);
  });

  it('bypasses rate limit with valid x402 payment proof', async () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';

    // Exhaust rate limit
    await apiGuard(makeRequest(), guardConfig);
    await apiGuard(makeRequest(), guardConfig);

    // Mock facilitator
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: true }),
    }));

    const proof = btoa(JSON.stringify({
      x402Version: 1,
      scheme: 'exact',
      network: 'solana-mainnet',
      payload: { tx: 'abc123' },
    }));

    const req = makeRequest({ 'x-payment': proof });
    const result = await apiGuard(req, guardConfig);
    expect(result).toBeNull();
  });

  it('returns 401 for invalid payment proof', async () => {
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

    const req = makeRequest({ 'x-payment': proof });
    const result = await apiGuard(req, guardConfig);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });
});
