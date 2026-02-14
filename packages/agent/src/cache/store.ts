import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '../logger.js';

export interface CacheEntry<T> {
  data: T;
  fetchedAt: string;
  expiresAt: string;
  source: string;
}

export class CacheStore {
  private cacheDir: string;
  private log = logger.child({ component: 'cache' });

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  private sourceDir(source: string): string {
    return join(this.cacheDir, source);
  }

  private entryPath(source: string, key: string): string {
    return join(this.sourceDir(source), `${key}.json`);
  }

  async has(source: string, key: string): Promise<boolean> {
    const entry = await this.getEntry<unknown>(source, key);
    return entry !== null;
  }

  async get<T>(source: string, key: string): Promise<T | null> {
    const entry = await this.getEntry<T>(source, key);
    if (!entry) return null;
    this.log.info({ source, key }, 'Cache hit');
    return entry.data;
  }

  async set<T>(source: string, key: string, data: T, ttlHours: number): Promise<void> {
    const dir = this.sourceDir(source);
    await mkdir(dir, { recursive: true });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 3600_000);

    const entry: CacheEntry<T> = {
      data,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source,
    };

    await writeFile(this.entryPath(source, key), JSON.stringify(entry, null, 2), 'utf-8');
    this.log.info({ source, key, ttlHours }, 'Cache write');
  }

  async clear(source?: string): Promise<void> {
    const target = source ? this.sourceDir(source) : this.cacheDir;
    try {
      await rm(target, { recursive: true, force: true });
      this.log.info({ source: source ?? 'all' }, 'Cache cleared');
    } catch {
      // Directory may not exist — that's fine
    }
  }

  private async getEntry<T>(source: string, key: string): Promise<CacheEntry<T> | null> {
    try {
      const raw = await readFile(this.entryPath(source, key), 'utf-8');
      const entry = JSON.parse(raw) as CacheEntry<T>;

      if (new Date(entry.expiresAt) < new Date()) {
        this.log.info({ source, key }, 'Cache expired');
        return null;
      }

      return entry;
    } catch {
      return null;
    }
  }

  async sources(): Promise<string[]> {
    try {
      const entries = await readdir(this.cacheDir, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).map(e => e.name);
    } catch {
      return [];
    }
  }
}
