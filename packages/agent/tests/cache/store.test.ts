import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

describe('CacheStore', () => {
  let tempDir: string;
  let CacheStore: typeof import('../../src/cache/store.js').CacheStore;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'solis-cache-'));
    const mod = await import('../../src/cache/store.js');
    CacheStore = mod.CacheStore;
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return null for missing key', async () => {
    const store = new CacheStore(tempDir);
    const result = await store.get('github', '2026-02-14');
    expect(result).toBeNull();
  });

  it('should report has=false for missing key', async () => {
    const store = new CacheStore(tempDir);
    expect(await store.has('github', '2026-02-14')).toBe(false);
  });

  it('should write and read a cache entry', async () => {
    const store = new CacheStore(tempDir);
    const data = { repos: [{ name: 'test/repo', stars: 100 }] };

    await store.set('github', '2026-02-14', data, 20);
    const result = await store.get<typeof data>('github', '2026-02-14');

    expect(result).toEqual(data);
  });

  it('should report has=true for existing non-expired key', async () => {
    const store = new CacheStore(tempDir);
    await store.set('github', '2026-02-14', { value: 1 }, 20);
    expect(await store.has('github', '2026-02-14')).toBe(true);
  });

  it('should return null for expired entry', async () => {
    const store = new CacheStore(tempDir);
    // Write with 0 TTL — immediately expired
    await store.set('github', '2026-02-14', { value: 1 }, 0);

    // Wait a tick so the expiry is in the past
    await new Promise(r => setTimeout(r, 10));

    const result = await store.get('github', '2026-02-14');
    expect(result).toBeNull();
  });

  it('should isolate sources in separate directories', async () => {
    const store = new CacheStore(tempDir);
    await store.set('github', '2026-02-14', { source: 'gh' }, 20);
    await store.set('coingecko', '2026-02-14', { source: 'cg' }, 20);

    const gh = await store.get<{ source: string }>('github', '2026-02-14');
    const cg = await store.get<{ source: string }>('coingecko', '2026-02-14');

    expect(gh?.source).toBe('gh');
    expect(cg?.source).toBe('cg');
  });

  it('should clear a specific source', async () => {
    const store = new CacheStore(tempDir);
    await store.set('github', '2026-02-14', { a: 1 }, 20);
    await store.set('coingecko', '2026-02-14', { b: 2 }, 20);

    await store.clear('github');

    expect(await store.get('github', '2026-02-14')).toBeNull();
    expect(await store.get('coingecko', '2026-02-14')).not.toBeNull();
  });

  it('should clear all sources', async () => {
    const store = new CacheStore(tempDir);
    await store.set('github', '2026-02-14', { a: 1 }, 20);
    await store.set('coingecko', '2026-02-14', { b: 2 }, 20);

    await store.clear();

    expect(await store.get('github', '2026-02-14')).toBeNull();
    expect(await store.get('coingecko', '2026-02-14')).toBeNull();
  });

  it('should list available sources', async () => {
    const store = new CacheStore(tempDir);
    await store.set('github', 'key1', { a: 1 }, 20);
    await store.set('defillama', 'key2', { b: 2 }, 20);

    const sources = await store.sources();
    expect(sources.sort()).toEqual(['defillama', 'github']);
  });

  it('should return empty sources for non-existent cache dir', async () => {
    const store = new CacheStore(join(tempDir, 'nonexistent'));
    const sources = await store.sources();
    expect(sources).toEqual([]);
  });

  it('should overwrite existing cache entry', async () => {
    const store = new CacheStore(tempDir);
    await store.set('github', 'key', { version: 1 }, 20);
    await store.set('github', 'key', { version: 2 }, 20);

    const result = await store.get<{ version: number }>('github', 'key');
    expect(result?.version).toBe(2);
  });
});
