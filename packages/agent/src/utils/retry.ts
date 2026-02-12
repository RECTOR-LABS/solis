import { logger } from '../logger.js';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Retry an async function with exponential backoff.
 * Throws after all attempts are exhausted — callers handle final fallback.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  opts: RetryOptions = {},
): Promise<T> {
  const { attempts = 3, baseDelayMs = 1000, maxDelayMs = 10_000 } = opts;
  const log = logger.child({ component: 'retry', label });

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === attempts) {
        log.error({ attempt, error: err instanceof Error ? err.message : err }, 'All retry attempts exhausted');
        throw err;
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      log.warn({ attempt, nextIn: delay, error: err instanceof Error ? err.message : err }, 'Retrying...');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // TypeScript: unreachable, but satisfies the compiler
  throw new Error(`withRetry: unreachable (${label})`);
}
