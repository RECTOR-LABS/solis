import { readFileSync } from 'node:fs';
import { fetchWithTimeout } from '@solis/shared/fetch';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { CacheStore } from '../cache/index.js';
import type { OnchainSignal } from '@solis/shared';

const HELIUS_RPC = 'https://mainnet.helius-rpc.com';

async function heliusRpc<T>(method: string, params: unknown): Promise<T | null> {
  const url = `${HELIUS_RPC}/?api-key=${env.HELIUS_API_KEY}`;
  const start = Date.now();

  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    const latency = Date.now() - start;
    if (!res.ok) {
      logger.warn({ method, status: res.status, latency }, 'Helius RPC error');
      return null;
    }

    const json = await res.json() as { result?: T; error?: unknown };
    if (json.error) {
      logger.error({ method, error: json.error }, 'Helius RPC response error');
      return null;
    }

    return json.result ?? null;
  } catch (err) {
    logger.error({ method, error: err, latency: Date.now() - start }, 'Helius RPC failed');
    return null;
  }
}

// Known Solana programs to track (default list)
const DEFAULT_PROGRAMS: Array<{ id: string; name: string }> = [
  { id: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', name: 'Jupiter v6' },
  { id: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', name: 'Orca Whirlpool' },
  { id: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', name: 'Raydium CLMM' },
  { id: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', name: 'Raydium AMM' },
  { id: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA', name: 'Marginfi' },
  { id: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo', name: 'Solend' },
  { id: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY', name: 'Phoenix' },
  { id: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', name: 'Helium' },
  { id: 'pytd2yc6ho2pVBMkAHnf5UM4pCmMA5tg7wHKGNbqJUj', name: 'Pyth Network' },
  { id: 'TCMPhJdwDryooaGtiocG1u3xcYbRpiJzb283XfCZsDp', name: 'Tensor' },
  { id: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K', name: 'Magic Eden v2' },
  { id: 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN', name: 'Tensor Swap' },
  { id: 'DRiFtyicJBZYRXMwiiAGrSqQoXk4UHyn228cqKaS8hTg', name: 'Drift Protocol' },
  { id: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH', name: 'Pyth Pull Oracle' },
  { id: 'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ', name: 'Sanctum' },
  { id: 'jCebN34bUfdeUYJT13J1yG16XWQpt5PDx6Mse9GUqhR', name: 'Jito Tip Router' },
  { id: 'stkitrT1Uoy18Dk1fTrgPw8W6MVzoCfYoAFT4MLsmhq', name: 'Jito Stake Pool' },
  { id: 'wns1t5RUSbGMDFBjkDJankyyyPkT8J2HaLLanWvk9Kz', name: 'WNS (Wen New Standard)' },
];

function loadPrograms(): Array<{ id: string; name: string }> {
  if (!env.HELIUS_PROGRAMS_PATH) return DEFAULT_PROGRAMS;
  try {
    const raw = readFileSync(env.HELIUS_PROGRAMS_PATH, 'utf-8');
    return JSON.parse(raw) as Array<{ id: string; name: string }>;
  } catch (err) {
    logger.warn({ path: env.HELIUS_PROGRAMS_PATH, error: err instanceof Error ? err.message : err }, 'Failed to load custom Helius programs — using defaults');
    return DEFAULT_PROGRAMS;
  }
}

interface TransactionSignature {
  signature: string;
  slot: number;
  blockTime: number | null;
}

async function getProgramTxCount(
  programId: string,
  periodDays: number,
): Promise<{ txCount: number; uniqueSigners: number }> {
  const sigs = await heliusRpc<TransactionSignature[]>(
    'getSignaturesForAddress',
    [programId, { limit: 1000 }],
  );

  if (!sigs) return { txCount: 0, uniqueSigners: 0 };

  const cutoff = Date.now() / 1000 - periodDays * 86400;
  const recentSigs = sigs.filter(s => (s.blockTime ?? 0) > cutoff);

  return {
    txCount: recentSigs.length,
    // TODO(#5): uniqueSigners requires batch getTransaction — deferred for RPC budget
    uniqueSigners: 0,
  };
}

export async function collectHelius(
  periodDays: number = 14,
  programs?: Array<{ id: string; name: string }>,
  cache?: CacheStore,
): Promise<OnchainSignal[]> {
  const log = logger.child({ tool: 'helius' });

  const cacheKey = new Date().toISOString().split('T')[0];
  if (cache) {
    const cached = await cache.get<OnchainSignal[]>('helius', cacheKey);
    if (cached) return cached;
  }

  const tracked = programs ?? loadPrograms();
  log.info({ programCount: tracked.length, periodDays }, 'Collecting Helius signals');

  const BATCH_SIZE = 5;
  const signals: OnchainSignal[] = [];

  for (let i = 0; i < tracked.length; i += BATCH_SIZE) {
    const batch = tracked.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (prog) => {
        const activity = await getProgramTxCount(prog.id, periodDays);
        return {
          programId: prog.id,
          programName: prog.name,
          txCount: activity.txCount,
          txDelta: 0,
          txZScore: 0,
          uniqueSigners: activity.uniqueSigners,
        } satisfies OnchainSignal;
      }),
    );
    signals.push(...results);

    if (i + BATCH_SIZE < tracked.length) {
      await new Promise(resolve => setTimeout(resolve, env.HELIUS_THROTTLE_MS));
    }
  }

  log.info({ collected: signals.length }, 'Helius collection complete');

  if (cache) await cache.set('helius', cacheKey, signals, env.CACHE_TTL_HOURS);
  return signals;
}
