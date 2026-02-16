export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

const MAX_ENTRIES = 10_000;

const store = new Map<string, WindowEntry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup(windowMs: number): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, windowMs);
  // Don't keep process alive just for cleanup
  if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

function evictOldest(): void {
  // Evict oldest 10% (Map preserves insertion order)
  const evictCount = Math.ceil(store.size * 0.1);
  let removed = 0;
  for (const key of store.keys()) {
    if (removed >= evictCount) break;
    store.delete(key);
    removed++;
  }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    if (store.size >= MAX_ENTRIES && !store.has(key)) {
      evictOldest();
    }
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    ensureCleanup(config.windowMs);
    return { allowed: true, limit: config.limit, remaining: config.limit - 1, resetAt };
  }

  entry.count++;
  const allowed = entry.count <= config.limit;
  const remaining = Math.max(0, config.limit - entry.count);

  return { allowed, limit: config.limit, remaining, resetAt: entry.resetAt };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}

const PRIVATE_IP_RE = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1|fc|fd|fe80)/;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Walk rightmost-first to find the first non-private IP (set by trusted proxy)
    const parts = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!PRIVATE_IP_RE.test(parts[i])) return parts[i];
    }
    // All private — fall through to first entry
    return parts[0] || '127.0.0.1';
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/** Reset store — test-only */
export function _resetStore(): void {
  store.clear();
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
