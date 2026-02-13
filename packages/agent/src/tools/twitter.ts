import { env } from '../config.js';
import { logger } from '../logger.js';
import type { XTopicSignal, XSignals } from '@solis/shared';

const X_API = 'https://api.x.com/2';

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

interface XSearchResponse {
  data?: XTweet[];
  includes?: { users?: XUser[] };
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
    const res = await fetch(url.toString(), { headers });

    if (res.status === 429) {
      const resetHeader = res.headers.get('x-rate-limit-reset');
      const waitMs = resetHeader
        ? Math.max(0, (parseInt(resetHeader, 10) * 1000) - Date.now()) + 1000
        : 15_000;
      logger.warn({ path, waitMs, latency: Date.now() - start }, 'X API rate limited — retrying');
      await new Promise(resolve => setTimeout(resolve, waitMs));
      const retry = await fetch(url.toString(), { headers });
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

// Extract topics from tweet text: $TICKER cashtags + known protocol names
const CASHTAG_RE = /\$([A-Z]{2,10})\b/g;

function extractTopics(text: string, knownNames: Set<string>): string[] {
  const topics = new Set<string>();

  // Extract $CASHTAG mentions
  for (const match of text.matchAll(CASHTAG_RE)) {
    topics.add(match[1].toUpperCase());
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

export async function collectX(
  periodDays: number,
  knownProtocols: string[] = [],
): Promise<XSignals> {
  const log = logger.child({ tool: 'x-twitter' });
  log.info({ periodDays }, 'Collecting X/Twitter signals');

  const queries = env.X_SEARCH_QUERIES.split(',').map(q => q.trim()).filter(Boolean);
  const maxPages = env.X_MAX_PAGES;
  const knownNames = new Set(knownProtocols);

  // Period bounds
  const now = new Date();
  const periodStart = new Date();
  // X recent search limited to 7 days; add 30s buffer to avoid boundary errors
  periodStart.setDate(now.getDate() - Math.min(periodDays, 7));
  periodStart.setTime(periodStart.getTime() + 30_000);

  const startTime = periodStart.toISOString();
  // X API requires end_time to be at least 10 seconds before request time
  const safeEnd = new Date(now.getTime() - 15_000);
  const endTime = safeEnd.toISOString();

  // Accumulate topics across all queries
  const topicMap = new Map<string, TopicAccumulator>();
  let totalTweetsAnalyzed = 0;

  for (const query of queries) {
    let nextToken: string | undefined;
    let pagesProcessed = 0;

    while (pagesProcessed < maxPages) {
      await new Promise(resolve => setTimeout(resolve, env.X_THROTTLE_MS));

      const params: Record<string, string> = {
        query,
        max_results: '100',
        'tweet.fields': 'public_metrics,created_at,author_id',
        expansions: 'author_id',
        'user.fields': 'username,verified',
        start_time: startTime,
        end_time: endTime,
      };
      if (nextToken) params.next_token = nextToken;

      const response = await xFetch<XSearchResponse>('/tweets/search/recent', params);

      if (!response?.data || response.data.length === 0) break;

      // Build author lookup from includes
      const userMap = new Map<string, XUser>();
      if (response.includes?.users) {
        for (const user of response.includes.users) {
          userMap.set(user.id, user);
        }
      }

      for (const tweet of response.data) {
        totalTweetsAnalyzed++;
        const topics = extractTopics(tweet.text, knownNames);
        const metrics = tweet.public_metrics;
        const engagement = metrics.like_count + metrics.retweet_count + metrics.quote_count;
        const author = userMap.get(tweet.author_id);
        const authorName = author?.username ?? 'unknown';

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
          acc.uniqueAuthors.add(tweet.author_id);
          if (author?.verified) acc.verifiedAuthors.add(tweet.author_id);

          // Keep top 3 tweets by engagement
          acc.topTweets.push({ text: tweet.text, engagement, author: authorName });
          if (acc.topTweets.length > 3) {
            acc.topTweets.sort((a, b) => b.engagement - a.engagement);
            acc.topTweets.length = 3;
          }
        }
      }

      pagesProcessed++;
      nextToken = response.meta?.next_token;
      if (!nextToken) break;
    }

    log.info({ query: query.slice(0, 60), pagesProcessed }, 'Query batch complete');
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
  }, 'X/Twitter collection complete');

  return {
    period: { start: periodStart.toISOString(), end: now.toISOString() },
    topics,
    anomalies: [], // populated by scoring phase
    topByEngagement,
    totalTweetsAnalyzed,
  };
}
