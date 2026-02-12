import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    LUNARCRUSH_API_KEY: 'test-key',
    LUNARCRUSH_THROTTLE_MS: 0,
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

describe('LunarCrush collector', () => {
  it('should export collectLunarCrush function', async () => {
    const { collectLunarCrush } = await import('../../src/tools/lunarcrush.js');
    expect(collectLunarCrush).toBeDefined();
    expect(typeof collectLunarCrush).toBe('function');
  });

  it('should return valid SocialSignals shape on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { collectLunarCrush } = await import('../../src/tools/lunarcrush.js');
    const result = await collectLunarCrush(14);

    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('coins');
    expect(result).toHaveProperty('anomalies');
    expect(result).toHaveProperty('topBySentiment');
    expect(result.coins).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(result.period.start).toBeDefined();
    expect(result.period.end).toBeDefined();

    vi.unstubAllGlobals();
  });

  it('should return coins filtered for Solana ecosystem', async () => {
    const mockCoins = {
      data: [
        { id: 1, symbol: 'SOL', name: 'Solana', price: 100, market_cap: 50e9, interactions_24h: 10000, social_dominance: 5.2, galaxy_score: 80, sentiment: 72, categories: 'solana,layer-1' },
        { id: 2, symbol: 'RAY', name: 'Raydium', price: 2, market_cap: 500e6, interactions_24h: 3000, social_dominance: 0.5, galaxy_score: 65, sentiment: 58, categories: 'solana,defi' },
        { id: 3, symbol: 'BTC', name: 'Bitcoin', price: 60000, market_cap: 1.2e12, interactions_24h: 50000, social_dominance: 30, galaxy_score: 90, sentiment: 75, categories: 'layer-1' },
      ],
    };

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockCoins) })
      // Topic fetches for top coins — return 404-like nulls
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: null }) });

    vi.stubGlobal('fetch', mockFetch);

    const mod = await import('../../src/tools/lunarcrush.js');
    const result = await mod.collectLunarCrush(14);

    // BTC should be filtered out (no solana category)
    expect(result.coins.length).toBe(2);
    expect(result.coins[0].topic).toBe('SOL');
    expect(result.coins[1].topic).toBe('RAY');
    expect(result.coins[0].interactions24h).toBe(10000);
    expect(result.coins[0].sentiment).toBe(72);
    expect(result.coins[0].galaxyScore).toBe(80);

    vi.unstubAllGlobals();
  });

  it('should sort coins by interactions descending', async () => {
    const mockCoins = {
      data: [
        { id: 1, symbol: 'JUP', name: 'Jupiter', price: 1, market_cap: 1e9, interactions_24h: 500, social_dominance: 0.1, galaxy_score: 50, sentiment: 60, categories: 'solana,defi' },
        { id: 2, symbol: 'SOL', name: 'Solana', price: 100, market_cap: 50e9, interactions_24h: 10000, social_dominance: 5, galaxy_score: 80, sentiment: 72, categories: 'solana,layer-1' },
      ],
    };

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockCoins) })
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: null }) });

    vi.stubGlobal('fetch', mockFetch);

    const mod = await import('../../src/tools/lunarcrush.js');
    const result = await mod.collectLunarCrush(14);

    expect(result.coins[0].topic).toBe('SOL');
    expect(result.coins[1].topic).toBe('JUP');

    vi.unstubAllGlobals();
  });

  it('should populate topBySentiment for coins with sentiment >= 60', async () => {
    const mockCoins = {
      data: [
        { id: 1, symbol: 'SOL', name: 'Solana', price: 100, market_cap: 50e9, interactions_24h: 10000, social_dominance: 5, galaxy_score: 80, sentiment: 72, categories: 'solana' },
        { id: 2, symbol: 'RAY', name: 'Raydium', price: 2, market_cap: 500e6, interactions_24h: 3000, social_dominance: 0.5, galaxy_score: 65, sentiment: 45, categories: 'solana' },
      ],
    };

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockCoins) })
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: null }) });

    vi.stubGlobal('fetch', mockFetch);

    const mod = await import('../../src/tools/lunarcrush.js');
    const result = await mod.collectLunarCrush(14);

    // Only SOL has sentiment >= 60
    expect(result.topBySentiment.length).toBe(1);
    expect(result.topBySentiment[0].topic).toBe('SOL');

    vi.unstubAllGlobals();
  });
});
