import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
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

describe('DeFi Llama collector', () => {
  it('should export collectDefiLlama function', async () => {
    const { collectDefiLlama } = await import('../../src/tools/defillama.js');
    expect(collectDefiLlama).toBeDefined();
    expect(typeof collectDefiLlama).toBe('function');
  });
});
