import { fetchWithTimeout } from '@solis/shared/fetch';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { CacheStore } from '../cache/index.js';
import type { TokenSignal, ConfirmingSignals } from '@solis/shared';

const CG_API = 'https://api.coingecko.com/api/v3';
const CG_PRO_API = 'https://pro-api.coingecko.com/api/v3';

function getBaseUrl(): string {
  return env.COINGECKO_API_KEY ? CG_PRO_API : CG_API;
}

async function cgFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${getBaseUrl()}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.COINGECKO_API_KEY) {
    headers['x-cg-pro-api-key'] = env.COINGECKO_API_KEY;
  }

  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url.toString(), { headers });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      logger.warn({ path, retryAfter, latency: Date.now() - start }, 'CoinGecko rate limited');
      await new Promise(resolve => setTimeout(resolve, (parseInt(retryAfter ?? '5', 10) + 1) * 1000));
      const retry = await fetchWithTimeout(url.toString(), { headers });
      if (!retry.ok) return null;
      return (await retry.json()) as T;
    }

    if (!res.ok) {
      logger.warn({ path, status: res.status, latency: Date.now() - start }, 'CoinGecko API error');
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    logger.error({ path, error: err, latency: Date.now() - start }, 'CoinGecko fetch failed');
    return null;
  }
}

interface CGMarketToken {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_7d_in_currency: number | null;
  price_change_percentage_14d_in_currency: number | null;
  total_volume: number;
  market_cap: number;
}

interface CGTrendingCoin {
  item: {
    id: string;
    symbol: string;
    name: string;
    data: {
      price: number;
      total_volume: string;
      market_cap: string;
    };
  };
}

interface CGCategory {
  id: string;
  name: string;
  market_cap: number;
  market_cap_change_24h: number;
  top_3_coins: string[];
}

async function getSolanaTokens(page: number = 1): Promise<CGMarketToken[]> {
  if (page > 1) {
    await new Promise(resolve => setTimeout(resolve, env.COINGECKO_THROTTLE_MS));
  }

  const data = await cgFetch<CGMarketToken[]>('/coins/markets', {
    vs_currency: 'usd',
    category: 'solana-ecosystem',
    order: 'market_cap_desc',
    per_page: '100',
    page: page.toString(),
    price_change_percentage: '7d,14d',
    sparkline: 'false',
  });

  return data ?? [];
}

async function getTrending(): Promise<CGTrendingCoin[]> {
  const data = await cgFetch<{ coins: CGTrendingCoin[] }>('/search/trending');
  return data?.coins ?? [];
}

async function getCategories(): Promise<CGCategory[]> {
  const data = await cgFetch<CGCategory[]>('/coins/categories', {
    order: 'market_cap_desc',
  });
  return data ?? [];
}

function toTokenSignal(token: CGMarketToken): TokenSignal {
  return {
    id: token.id,
    symbol: token.symbol.toUpperCase(),
    name: token.name,
    price: token.current_price,
    priceDelta7d: token.price_change_percentage_7d_in_currency ?? 0,
    priceDelta14d: token.price_change_percentage_14d_in_currency ?? 0,
    volume24h: token.total_volume,
    volumeDelta: 0,
    volumeZScore: 0,
    marketCap: token.market_cap,
    category: 'solana-ecosystem',
  };
}

export async function collectCoinGecko(
  maxPages: number = 2,
  cache?: CacheStore,
): Promise<ConfirmingSignals> {
  const log = logger.child({ tool: 'coingecko' });

  const cacheKey = new Date().toISOString().split('T')[0];
  if (cache) {
    const cached = await cache.get<ConfirmingSignals>('coingecko', cacheKey);
    if (cached) return cached;
  }

  log.info({ maxPages }, 'Collecting CoinGecko signals');

  const allTokens: CGMarketToken[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const tokens = await getSolanaTokens(page);
    allTokens.push(...tokens);
    if (tokens.length < 100) break;
  }

  await new Promise(resolve => setTimeout(resolve, env.COINGECKO_THROTTLE_MS));
  const trending = await getTrending();

  await new Promise(resolve => setTimeout(resolve, env.COINGECKO_THROTTLE_MS));
  const categories = await getCategories();

  const tokenSignals = allTokens.map(toTokenSignal);

  const solanaTokenIds = new Set(allTokens.map(t => t.id));
  const trendingSolana = trending
    .filter(t => solanaTokenIds.has(t.item.id))
    .map(t => ({
      id: t.item.id,
      symbol: t.item.symbol.toUpperCase(),
      name: t.item.name,
      price: t.item.data.price,
      priceDelta7d: 0,
      priceDelta14d: 0,
      volume24h: parseFloat(t.item.data.total_volume.replace(/[^0-9.]/g, '')) || 0,
      volumeDelta: 0,
      volumeZScore: 0,
      marketCap: parseFloat(t.item.data.market_cap.replace(/[^0-9.]/g, '')) || 0,
      category: 'trending',
    } satisfies TokenSignal));

  const solanaCategories = categories
    .filter(c =>
      c.name.toLowerCase().includes('solana') ||
      c.id.includes('solana'),
    )
    .map(c => ({
      category: c.name,
      marketCap: c.market_cap ?? 0,
      marketCapDelta: c.market_cap_change_24h ?? 0,
      topTokens: c.top_3_coins ?? [],
    }));

  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(now.getDate() - 14);

  log.info({
    tokens: tokenSignals.length,
    trending: trendingSolana.length,
    categories: solanaCategories.length,
  }, 'CoinGecko collection complete');

  const result: ConfirmingSignals = {
    period: {
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    tokens: tokenSignals,
    trending: trendingSolana,
    categoryPerformance: solanaCategories,
  };

  if (cache) await cache.set('coingecko', cacheKey, result, env.CACHE_TTL_HOURS);
  return result;
}
