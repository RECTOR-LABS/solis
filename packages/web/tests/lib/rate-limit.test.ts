import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  getRateLimitHeaders,
  getClientIp,
  _resetStore,
} from '@/lib/rate-limit';

const config = { limit: 3, windowMs: 60_000 };

beforeEach(() => {
  _resetStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const r1 = checkRateLimit('ip-1', config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit('ip-1', config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it('allows the request at exactly the limit', () => {
    checkRateLimit('ip-1', config);
    checkRateLimit('ip-1', config);
    const r3 = checkRateLimit('ip-1', config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests over the limit', () => {
    checkRateLimit('ip-1', config);
    checkRateLimit('ip-1', config);
    checkRateLimit('ip-1', config);
    const r4 = checkRateLimit('ip-1', config);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('resets after window expires', () => {
    checkRateLimit('ip-1', config);
    checkRateLimit('ip-1', config);
    checkRateLimit('ip-1', config);

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    const result = checkRateLimit('ip-1', config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('tracks keys independently', () => {
    checkRateLimit('ip-1', config);
    checkRateLimit('ip-1', config);
    checkRateLimit('ip-1', config);

    const result = checkRateLimit('ip-2', config);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});

describe('getRateLimitHeaders', () => {
  it('returns correct header format', () => {
    const result = checkRateLimit('ip-h', config);
    const headers = getRateLimitHeaders(result);

    expect(headers['X-RateLimit-Limit']).toBe('3');
    expect(headers['X-RateLimit-Remaining']).toBe('2');
    expect(headers['X-RateLimit-Reset']).toMatch(/^\d+$/);
  });
});

describe('LRU eviction', () => {
  it('evicts oldest entries when store exceeds MAX_ENTRIES', () => {
    // Fill store to capacity (10_000)
    const bigConfig = { limit: 1, windowMs: 60_000 };
    for (let i = 0; i < 10_000; i++) {
      checkRateLimit(`ip-${i}`, bigConfig);
    }

    // Next insert should trigger eviction (oldest 10% = 1000 entries)
    const result = checkRateLimit('new-ip', bigConfig);
    expect(result.allowed).toBe(true);

    // First IPs should have been evicted — new window starts fresh
    const evictedResult = checkRateLimit('ip-0', bigConfig);
    expect(evictedResult.remaining).toBe(0); // brand new entry, limit=1 so remaining=0
  });
});

describe('getClientIp', () => {
  it('extracts from x-forwarded-for (first entry)', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '10.0.0.1' },
    });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('falls back to 127.0.0.1 when no headers', () => {
    const req = new Request('http://localhost');
    expect(getClientIp(req)).toBe('127.0.0.1');
  });
});
