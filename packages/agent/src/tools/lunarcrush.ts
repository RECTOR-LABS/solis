import { env } from '../config.js';
import { logger } from '../logger.js';
import type { SocialSignal, SocialSignals } from '@solis/shared';

const LC_API = 'https://lunarcrush.com/api4';

async function lcFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${LC_API}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${env.LUNARCRUSH_API_KEY}`,
  };

  const start = Date.now();
  try {
    const res = await fetch(url.toString(), { headers });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after');
      logger.warn({ path, retryAfter, latency: Date.now() - start }, 'LunarCrush rate limited');
      await new Promise(resolve => setTimeout(resolve, (parseInt(retryAfter ?? '5', 10) + 1) * 1000));
      const retry = await fetch(url.toString(), { headers });
      if (!retry.ok) return null;
      return (await retry.json()) as T;
    }

    if (!res.ok) {
      logger.warn({ path, status: res.status, latency: Date.now() - start }, 'LunarCrush API error');
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    logger.error({ path, error: err, latency: Date.now() - start }, 'LunarCrush fetch failed');
    return null;
  }
}

interface LCCoin {
  id: number;
  symbol: string;
  name: string;
  price: number;
  market_cap: number;
  interactions_24h: number;
  social_dominance: number;
  galaxy_score: number;
  sentiment: number;
  categories: string;
}

interface LCCoinsResponse {
  data: LCCoin[];
}

interface LCTopic {
  topic: string;
  title: string;
  topic_rank: number;
  interactions_24h: number;
  num_contributors: number;
  num_posts: number;
  sentiment: number;
}

function isSolanaRelated(coin: LCCoin): boolean {
  const cats = (coin.categories ?? '').toLowerCase();
  return cats.includes('solana');
}

function toSocialSignal(coin: LCCoin, topic?: LCTopic): SocialSignal {
  return {
    topic: coin.symbol.toUpperCase(),
    interactions24h: coin.interactions_24h ?? 0,
    interactionsDelta: 0, // populated by delta phase
    interactionsZScore: 0, // populated by scoring phase
    sentiment: coin.sentiment ?? 0,
    socialDominance: coin.social_dominance ?? 0,
    galaxyScore: coin.galaxy_score ?? 0,
    contributors: topic?.num_contributors ?? 0,
    posts: topic?.num_posts ?? 0,
  };
}

export async function collectLunarCrush(
  periodDays: number,
): Promise<SocialSignals> {
  const log = logger.child({ tool: 'lunarcrush' });
  log.info({ periodDays }, 'Collecting LunarCrush social signals');

  // Fetch Solana ecosystem coins with social metrics
  const coinsData = await lcFetch<LCCoinsResponse>('/public/coins/list/v2', {
    filter: 'solana',
    sort: 'interactions_24h',
    limit: '100',
    desc: 'true',
  });

  const coins = coinsData?.data ?? [];
  const solanaCoinsList = coins.filter(isSolanaRelated);

  log.info({ total: coins.length, solanaFiltered: solanaCoinsList.length }, 'Coins fetched');

  // Fetch topic details for top coins (contributors + posts enrichment)
  const topCoins = solanaCoinsList.slice(0, 20);
  const topicMap = new Map<string, LCTopic>();

  for (const coin of topCoins) {
    await new Promise(resolve => setTimeout(resolve, env.LUNARCRUSH_THROTTLE_MS));
    const topicSlug = coin.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const topicData = await lcFetch<{ data: LCTopic }>(`/public/topic/${encodeURIComponent(topicSlug)}/v1`);
    if (topicData?.data) {
      topicMap.set(coin.symbol.toUpperCase(), topicData.data);
    }
  }

  // Map to SocialSignal format
  const signals: SocialSignal[] = solanaCoinsList.map(coin =>
    toSocialSignal(coin, topicMap.get(coin.symbol.toUpperCase())),
  );

  // Sort by interactions for ranking
  signals.sort((a, b) => b.interactions24h - a.interactions24h);

  // Top by sentiment (>= 60 sentiment, sorted by galaxy score)
  const topBySentiment = [...signals]
    .filter(s => s.sentiment >= 60)
    .sort((a, b) => b.galaxyScore - a.galaxyScore)
    .slice(0, 10);

  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(now.getDate() - periodDays);

  log.info({
    coins: signals.length,
    topBySentiment: topBySentiment.length,
    topicsEnriched: topicMap.size,
  }, 'LunarCrush collection complete');

  return {
    period: {
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    coins: signals,
    anomalies: [], // populated by scoring phase
    topBySentiment,
  };
}
