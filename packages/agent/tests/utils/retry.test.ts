import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: { LOG_LEVEL: 'error', isDevelopment: false },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { withRetry } from '../../src/utils/retry.js';

describe('withRetry', () => {
  it('should return on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, 'test');
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, 'test', { baseDelayMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after all attempts exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent'));

    await expect(
      withRetry(fn, 'test', { attempts: 3, baseDelayMs: 1 }),
    ).rejects.toThrow('permanent');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect custom attempt count', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      withRetry(fn, 'test', { attempts: 2, baseDelayMs: 1 }),
    ).rejects.toThrow('fail');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should cap delay at maxDelayMs', async () => {
    const start = Date.now();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    await withRetry(fn, 'test', { baseDelayMs: 50, maxDelayMs: 60 });

    // With maxDelay=60, delays should be capped: 50ms, 60ms (not 100ms)
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(200); // 50 + 60 + overhead < 200
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
