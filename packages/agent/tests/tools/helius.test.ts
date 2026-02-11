import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    HELIUS_API_KEY: 'test-key',
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

describe('Helius collector', () => {
  it('should export collectHelius function', async () => {
    const { collectHelius } = await import('../../src/tools/helius.js');
    expect(collectHelius).toBeDefined();
    expect(typeof collectHelius).toBe('function');
  });
});
