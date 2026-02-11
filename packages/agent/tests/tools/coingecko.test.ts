import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    COINGECKO_API_KEY: '',
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

describe('CoinGecko collector', () => {
  it('should export collectCoinGecko function', async () => {
    const { collectCoinGecko } = await import('../../src/tools/coingecko.js');
    expect(collectCoinGecko).toBeDefined();
    expect(typeof collectCoinGecko).toBe('function');
  });
});
