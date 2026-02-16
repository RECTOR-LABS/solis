import { fetchWithTimeout } from '@solis/shared/fetch';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { XTopicSignal, XSignals } from '@solis/shared';

const X_API = 'https://api.x.com/2';

// Solana ecosystem protocol names that KOLs reference in tweets
const SOLANA_PROTOCOL_NAMES = [
  'Jupiter', 'Raydium', 'Orca', 'Drift', 'Jito', 'Marinade',
  'Pyth', 'Switchboard', 'Metaplex', 'Tensor', 'Phantom',
  'Solflare', 'Helius', 'Wormhole', 'LayerZero', 'Helium',
  'Hivemapper', 'Nosana', 'MagicBlock', 'Dialect', 'Bonfida',
  'Kamino', 'Sanctum', 'MarginFi', 'Solend', 'Phoenix',
  'OpenBook', 'Firedancer', 'Anchor', 'Squads', 'Backpack',
  'DeBridge', 'Tiplink', 'Clockwork', 'Neon EVM',
  'Solana', 'Saga', 'Seeker', 'Blinks', 'Actions',
];

// Known Solana token tickers — filters out non-Solana cashtag noise ($BTC, $ETH, etc.)
const SOLANA_TOKENS = new Set([
  'SOL', 'JUP', 'RAY', 'BONK', 'JTO', 'PYTH', 'HNT', 'RNDR',
  'ORCA', 'MNDE', 'MSOL', 'JSOL', 'BSOL', 'INF',
  'WIF', 'POPCAT', 'MEW', 'PENGU',
  'W', 'JLP', 'KMNO', 'DRIFT',
  'MOBILE', 'IOT', 'RENDER', 'SAMO',
  'FIDA', 'SHDW', 'BLZE', 'STEP',
]);

interface XTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface XUser {
  id: string;
  username: string;
  verified: boolean;
}

interface XUserLookupResponse {
  data?: XUser[];
}

interface XTimelineResponse {
  data?: XTweet[];
  meta?: {
    next_token?: string;
    result_count: number;
  };
}

async function xFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(`${X_API}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.X_BEARER_TOKEN}`,
  };

  const start = Date.now();
  try {
    const res = await fetchWithTimeout(url.toString(), { headers });

    if (res.status === 429) {
      const resetHeader = res.headers.get('x-rate-limit-reset');
      const waitMs = resetHeader
        ? Math.max(0, (parseInt(resetHeader, 10) * 1000) - Date.now()) + 1000
        : 15_000;
      logger.warn({ path, waitMs, latency: Date.now() - start }, 'X API rate limited — retrying');
      await new Promise(resolve => setTimeout(resolve, waitMs));
      const retry = await fetchWithTimeout(url.toString(), { headers });
      if (!retry.ok) return null;
      return (await retry.json()) as T;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn({ path, status: res.status, body: body.slice(0, 200), latency: Date.now() - start }, 'X API error');
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    logger.error({ path, error: err, latency: Date.now() - start }, 'X API fetch failed');
    return null;
  }
}

// Extract topics from tweet text: $TICKER cashtags (Solana only) + known protocol names
const CASHTAG_RE = /\$([A-Z]{2,10})\b/g;

function extractTopics(text: string, knownNames: Set<string>): string[] {
  const topics = new Set<string>();

  // Extract $CASHTAG mentions — only keep Solana ecosystem tokens
  for (const match of text.matchAll(CASHTAG_RE)) {
    const ticker = match[1].toUpperCase();
    if (SOLANA_TOKENS.has(ticker)) {
      topics.add(ticker);
    }
  }

  // Match known protocol/project names (case-insensitive)
  const lowerText = text.toLowerCase();
  for (const name of knownNames) {
    if (lowerText.includes(name.toLowerCase())) {
      topics.add(name);
    }
  }

  return [...topics];
}

interface TopicAccumulator {
  tweetCount: number;
  totalEngagement: number;
  uniqueAuthors: Set<string>;
  verifiedAuthors: Set<string>;
  topTweets: { text: string; engagement: number; author: string }[];
}

function emptyResult(): XSignals {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - 7);
  return {
    period: { start: start.toISOString(), end: now.toISOString() },
    topics: [],
    anomalies: [],
    topByEngagement: [],
    totalTweetsAnalyzed: 0,
  };
}

export async function collectX(
  periodDays: number,
  knownProtocols: string[] = [],
): Promise<XSignals> {
  const log = logger.child({ tool: 'x-twitter' });

  const handles = env.X_KOL_HANDLES.split(',').map(h => h.trim()).filter(Boolean);
  const tweetsPerKol = env.X_TWEETS_PER_KOL;
  const knownNames = new Set([...SOLANA_PROTOCOL_NAMES, ...knownProtocols]);

  log.info({ kols: handles.length, tweetsPerKol, periodDays }, 'Collecting X/Twitter KOL signals');

  // Step 1: Resolve usernames → user IDs
  const userLookup = await xFetch<XUserLookupResponse>('/users/by', {
    usernames: handles.join(','),
    'user.fields': 'username,verified',
  });

  if (!userLookup?.data || userLookup.data.length === 0) {
    log.warn('Failed to look up KOL user IDs — returning empty signals');
    return emptyResult();
  }

  const kolUsers = userLookup.data;
  log.info({
    resolved: kolUsers.map(u => u.username),
    requested: handles.length,
  }, 'KOL users resolved');

  // Step 2: Fetch timeline for each KOL
  const topicMap = new Map<string, TopicAccumulator>();
  let totalTweetsAnalyzed = 0;
  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(now.getDate() - Math.min(periodDays, 7));

  for (const user of kolUsers) {
    await new Promise(resolve => setTimeout(resolve, env.X_THROTTLE_MS));

    const params: Record<string, string> = {
      max_results: String(Math.max(5, Math.min(100, tweetsPerKol))),
      'tweet.fields': 'public_metrics,created_at,author_id',
      exclude: 'retweets,replies',
      start_time: periodStart.toISOString(),
      end_time: new Date(now.getTime() - 15_000).toISOString(),
    };

    const timeline = await xFetch<XTimelineResponse>(`/users/${user.id}/tweets`, params);

    if (!timeline?.data || timeline.data.length === 0) {
      log.info({ username: user.username }, 'No tweets in period for KOL');
      continue;
    }

    for (const tweet of timeline.data) {
      totalTweetsAnalyzed++;
      const topics = extractTopics(tweet.text, knownNames);
      const metrics = tweet.public_metrics;
      const engagement = metrics.like_count + metrics.retweet_count + metrics.quote_count;

      for (const topic of topics) {
        let acc = topicMap.get(topic);
        if (!acc) {
          acc = {
            tweetCount: 0,
            totalEngagement: 0,
            uniqueAuthors: new Set(),
            verifiedAuthors: new Set(),
            topTweets: [],
          };
          topicMap.set(topic, acc);
        }

        acc.tweetCount++;
        acc.totalEngagement += engagement;
        acc.uniqueAuthors.add(user.id);
        if (user.verified) acc.verifiedAuthors.add(user.id);

        // Keep top 3 tweets per topic by engagement
        acc.topTweets.push({ text: tweet.text, engagement, author: user.username });
        if (acc.topTweets.length > 3) {
          acc.topTweets.sort((a, b) => b.engagement - a.engagement);
          acc.topTweets.length = 3;
        }
      }
    }

    log.info({ username: user.username, tweets: timeline.data.length }, 'KOL timeline processed');
  }

  // Convert accumulator to XTopicSignal[]
  const topics: XTopicSignal[] = [...topicMap.entries()].map(([topic, acc]) => ({
    topic,
    tweetCount: acc.tweetCount,
    tweetCountDelta: 0,
    tweetCountZScore: 0,
    totalEngagement: acc.totalEngagement,
    engagementDelta: 0,
    engagementZScore: 0,
    uniqueAuthors: acc.uniqueAuthors.size,
    verifiedAuthors: acc.verifiedAuthors.size,
    topTweets: acc.topTweets,
  }));

  // Sort by engagement
  topics.sort((a, b) => b.totalEngagement - a.totalEngagement);

  const topByEngagement = topics.slice(0, 20);

  log.info({
    totalTweetsAnalyzed,
    topicsExtracted: topics.length,
    topByEngagement: topByEngagement.length,
    kols: kolUsers.map(u => u.username),
  }, 'X/Twitter KOL collection complete');

  return {
    period: { start: periodStart.toISOString(), end: now.toISOString() },
    topics,
    anomalies: [], // populated by scoring phase
    topByEngagement,
    totalTweetsAnalyzed,
  };
}
