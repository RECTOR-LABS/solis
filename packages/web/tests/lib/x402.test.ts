import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isX402Enabled,
  buildPaymentRequired,
  parsePaymentProof,
  verifyPayment,
} from '@/lib/x402';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe('isX402Enabled', () => {
  it('returns false when not configured', () => {
    delete process.env.ENABLE_X402;
    delete process.env.X402_RECEIVER_ADDRESS;
    expect(isX402Enabled()).toBe(false);
  });

  it('returns false when enabled but no receiver', () => {
    process.env.ENABLE_X402 = 'true';
    delete process.env.X402_RECEIVER_ADDRESS;
    expect(isX402Enabled()).toBe(false);
  });

  it('returns true when fully configured', () => {
    process.env.ENABLE_X402 = 'true';
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';
    expect(isX402Enabled()).toBe(true);
  });
});

describe('buildPaymentRequired', () => {
  it('returns 402 with correct x402 body', async () => {
    process.env.X402_RECEIVER_ADDRESS = 'SoLANAaddr123';
    process.env.X402_PRICE_CENTS = '1';

    const res = buildPaymentRequired('/api/reports');
    expect(res.status).toBe(402);

    const body = await res.json();
    expect(body.x402Version).toBe(1);
    expect(body.accepts).toHaveLength(1);
    expect(body.accepts[0].scheme).toBe('exact');
    expect(body.accepts[0].network).toBe('solana-mainnet');
    expect(body.accepts[0].maxAmountRequired).toBe('10000');
    expect(body.accepts[0].resource).toBe('/api/reports');
    expect(body.accepts[0].payTo).toBe('SoLANAaddr123');
    expect(body.accepts[0].asset).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  });
});

describe('parsePaymentProof', () => {
  it('parses valid base64 proof', () => {
    const proof = {
      x402Version: 1,
      scheme: 'exact',
      network: 'solana-mainnet',
      payload: { tx: 'abc123' },
    };
    const encoded = btoa(JSON.stringify(proof));
    const result = parsePaymentProof(encoded);
    expect(result).toEqual(proof);
  });

  it('returns null for invalid base64', () => {
    expect(parsePaymentProof('not-base64!!!')).toBeNull();
  });

  it('returns null for valid JSON missing required fields', () => {
    const encoded = btoa(JSON.stringify({ random: 'data' }));
    expect(parsePaymentProof(encoded)).toBeNull();
  });
});

describe('verifyPayment', () => {
  const validProof = {
    x402Version: 1,
    scheme: 'exact',
    network: 'solana-mainnet',
    payload: { tx: 'abc123' },
  };
  const validHeader = btoa(JSON.stringify(validProof));

  it('returns valid for successful facilitator verification', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: true }),
    }));

    const result = await verifyPayment(validHeader);
    expect(result.valid).toBe(true);
  });

  it('returns invalid when facilitator rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ valid: false }),
    }));

    const result = await verifyPayment(validHeader);
    expect(result.valid).toBe(false);
  });

  it('returns error for facilitator HTTP failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const result = await verifyPayment(validHeader);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('500');
  });

  it('returns error for network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const result = await verifyPayment(validHeader);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns error for malformed header', async () => {
    const result = await verifyPayment('garbage');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Malformed');
  });
});
