import { fetchWithTimeout } from '@solis/shared/fetch';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { CacheStore } from '../cache/index.js';
import type { TVLSignal, DEXVolumeSignal, CoincidentSignals } from '@solis/shared';

const DEFILLAMA_API = 'https://api.llama.fi';

async function llamaFetch<T>(url: string): Promise<T | null> {
  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      logger.warn({ url, status: res.status, latency: Date.now() - start }, 'DeFi Llama API error');
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    logger.error({ url, error: err, latency: Date.now() - start }, 'DeFi Llama fetch failed');
    return null;
  }
}

interface LlamaProtocol {
  name: string;
  slug: string;
  category: string;
  chain: string;
  chains: string[];
  tvl: number;
  change_1d: number | null;
  change_7d: number | null;
  change_1m: number | null;
}

interface LlamaChainTVL {
  date: number;
  tvl: number;
}

interface LlamaDEXOverview {
  protocols: Array<{
    name: string;
    total24h: number | null;
    total7d: number | null;
    change_1d: number | null;
  }>;
  total24h: number;
}

async function getSolanaProtocols(): Promise<LlamaProtocol[]> {
  const protocols = await llamaFetch<LlamaProtocol[]>(`${DEFILLAMA_API}/protocols`);
  if (!protocols) return [];

  return protocols.filter(
    p => p.chains?.includes('Solana') || p.chain === 'Solana',
  );
}

async function getSolanaTVLHistory(): Promise<LlamaChainTVL[]> {
  const data = await llamaFetch<LlamaChainTVL[]>(`${DEFILLAMA_API}/v2/historicalChainTvl/Solana`);
  return data ?? [];
}

async function getSolanaDEXVolumes(): Promise<LlamaDEXOverview | null> {
  return llamaFetch<LlamaDEXOverview>(`${DEFILLAMA_API}/overview/dexs/Solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`);
}

async function getSolanaStablecoinFlows(): Promise<{ netFlow: number; inflows: number; outflows: number }> {
  const data = await llamaFetch<{ peggedAssets: Array<{ name: string; circulating: { peggedUSD: number }; circulatingPrevDay: { peggedUSD: number }; chains: string[] }> }>(
    'https://stablecoins.llama.fi/stablecoins?includePrices=false',
  );

  if (!data?.peggedAssets) return { netFlow: 0, inflows: 0, outflows: 0 };

  // Filter to stablecoins present on Solana
  const chainStables = data.peggedAssets.filter(a => a.chains?.includes('Solana'));

  let inflows = 0;
  let outflows = 0;

  for (const stable of chainStables) {
    const current = stable.circulating?.peggedUSD ?? 0;
    const prev = stable.circulatingPrevDay?.peggedUSD ?? 0;
    const delta = current - prev;
    if (delta > 0) inflows += delta;
    else outflows += Math.abs(delta);
  }

  return { netFlow: inflows - outflows, inflows, outflows };
}

export async function collectDefiLlama(
  periodDays: number = 14,
  cache?: CacheStore,
): Promise<Omit<CoincidentSignals, 'onchain'>> {
  const log = logger.child({ tool: 'defillama' });

  const cacheKey = new Date().toISOString().split('T')[0];
  if (cache) {
    const cached = await cache.get<Omit<CoincidentSignals, 'onchain'>>('defillama', cacheKey);
    if (cached) return cached;
  }

  log.info({ periodDays }, 'Collecting DeFi Llama signals');

  const [protocols, tvlHistory, dexData, stableFlows] = await Promise.all([
    getSolanaProtocols(),
    getSolanaTVLHistory(),
    getSolanaDEXVolumes(),
    getSolanaStablecoinFlows(),
  ]);

  const latestTVL = tvlHistory.length > 0
    ? tvlHistory[tvlHistory.length - 1].tvl
    : 0;
  const priorTVL = tvlHistory.length > periodDays
    ? tvlHistory[tvlHistory.length - 1 - periodDays].tvl
    : latestTVL;

  const tvlSignals: TVLSignal[] = protocols
    .filter(p => p.tvl > env.DEFILLAMA_MIN_TVL)
    .map(p => ({
      protocol: p.name,
      category: p.category ?? 'Unknown',
      tvl: p.tvl,
      tvlDelta: p.change_1m !== null ? p.tvl * (p.change_1m / 100) : 0,
      tvlDeltaPercent: p.change_1m ?? 0,
      tvlZScore: 0,
    }))
    .sort((a, b) => b.tvl - a.tvl);

  const dexSignals: DEXVolumeSignal[] = dexData?.protocols
    ?.filter(p => p.total24h !== null && p.total24h! > 0)
    .map(p => ({
      protocol: p.name,
      volume24h: p.total24h ?? 0,
      volumeDelta: 0, // delta calculated from previous report in applyDeltas()
      volumeZScore: 0,
    }))
    .sort((a, b) => b.volume24h - a.volume24h) ?? [];

  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(now.getDate() - periodDays);

  log.info({
    protocols: tvlSignals.length,
    dexProtocols: dexSignals.length,
    totalTVL: latestTVL,
  }, 'DeFi Llama collection complete');

  const result: Omit<CoincidentSignals, 'onchain'> = {
    period: {
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    tvl: {
      total: latestTVL,
      totalDelta: latestTVL - priorTVL,
      protocols: tvlSignals,
      anomalies: [],
    },
    dexVolumes: {
      total: dexData?.total24h ?? 0,
      protocols: dexSignals,
    },
    stablecoinFlows: stableFlows,
  };

  if (cache) await cache.set('defillama', cacheKey, result, env.CACHE_TTL_HOURS);
  return result;
}
