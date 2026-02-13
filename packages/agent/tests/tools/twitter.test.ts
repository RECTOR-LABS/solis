import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    X_BEARER_TOKEN: 'test-bearer-token',
    X_THROTTLE_MS: 0,
    X_KOL_HANDLES: 'mert,toly,akshaybd',
    X_TWEETS_PER_KOL: 10,
    LLM_TOP_X_TOPICS: 20,
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

function makeTweet(id: string, text: string, authorId: string, likes = 10, retweets = 5, quotes = 2) {
  return {
    id,
    text,
    author_id: authorId,
    created_at: '2026-02-12T10:00:00Z',
    public_metrics: {
      like_count: likes,
      retweet_count: retweets,
      reply_count: 1,
      quote_count: quotes,
    },
  };
}

function makeUserLookupResponse(users: { id: string; username: string; verified?: boolean }[]) {
  return {
    data: users.map(u => ({ id: u.id, username: u.username, verified: u.verified ?? false })),
  };
}

function makeTimelineResponse(tweets: ReturnType<typeof makeTweet>[], nextToken?: string) {
  return {
    data: tweets.length > 0 ? tweets : undefined,
    meta: { result_count: tweets.length, ...(nextToken ? { next_token: nextToken } : {}) },
  };
}

describe('X/Twitter KOL collector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should export collectX function', async () => {
    const { collectX } = await import('../../src/tools/twitter.js');
    expect(collectX).toBeDefined();
    expect(typeof collectX).toBe('function');
  });

  it('should return valid XSignals shape on network failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(14);

    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('topics');
    expect(result).toHaveProperty('anomalies');
    expect(result).toHaveProperty('topByEngagement');
    expect(result).toHaveProperty('totalTweetsAnalyzed');
    expect(result.topics).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(result.totalTweetsAnalyzed).toBe(0);

    vi.unstubAllGlobals();
  });

  it('should look up KOL user IDs then fetch timelines', async () => {
    const userLookup = makeUserLookupResponse([
      { id: 'u1', username: 'mert' },
      { id: 'u2', username: 'toly' },
      { id: 'u3', username: 'akshaybd' },
    ]);

    const mertTimeline = makeTimelineResponse([
      makeTweet('t1', 'Helius just shipped $SOL compression', 'u1', 100, 50, 10),
    ]);
    const tolyTimeline = makeTimelineResponse([
      makeTweet('t2', '$JUP airdrop is live, Jupiter leading DeFi', 'u2', 200, 80, 20),
    ]);
    const akshayTimeline = makeTimelineResponse([
      makeTweet('t3', 'Solana DePIN is accelerating with $HNT', 'u3', 50, 20, 5),
    ]);

    const mockFetch = vi.fn()
      // User lookup
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      // Timelines in order
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mertTimeline) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(tolyTimeline) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(akshayTimeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    // 4 API calls: 1 lookup + 3 timelines
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.totalTweetsAnalyzed).toBe(3);

    // First call should be user lookup
    const lookupUrl = mockFetch.mock.calls[0][0];
    expect(lookupUrl).toContain('/users/by');
    expect(lookupUrl).toContain('usernames=mert%2Ctoly%2Cakshaybd');

    // Second call should be timeline for user u1
    const timelineUrl = mockFetch.mock.calls[1][0];
    expect(timelineUrl).toContain('/users/u1/tweets');

    vi.unstubAllGlobals();
  });

  it('should extract only Solana cashtags, filtering out non-Solana tokens', async () => {
    const userLookup = makeUserLookupResponse([{ id: 'u1', username: 'mert' }]);
    const timeline = makeTimelineResponse([
      makeTweet('t1', '$SOL is outperforming $BTC and $ETH, bullish on $JUP', 'u1', 50, 20, 5),
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(timeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const topicNames = result.topics.map(t => t.topic);
    expect(topicNames).toContain('SOL');
    expect(topicNames).toContain('JUP');
    // Non-Solana tokens should be filtered out
    expect(topicNames).not.toContain('BTC');
    expect(topicNames).not.toContain('ETH');

    vi.unstubAllGlobals();
  });

  it('should match known Solana protocol names from tweet text', async () => {
    const userLookup = makeUserLookupResponse([{ id: 'u1', username: 'toly' }]);
    const timeline = makeTimelineResponse([
      makeTweet('t1', 'Jupiter is the best DEX on Solana right now', 'u1', 100, 40, 10),
      makeTweet('t2', 'Firedancer going to change everything for Helius infra', 'u1', 80, 30, 8),
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(timeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const topicNames = result.topics.map(t => t.topic);
    expect(topicNames).toContain('Jupiter');
    expect(topicNames).toContain('Solana');
    expect(topicNames).toContain('Firedancer');
    expect(topicNames).toContain('Helius');

    vi.unstubAllGlobals();
  });

  it('should aggregate engagement per topic across KOLs', async () => {
    const userLookup = makeUserLookupResponse([
      { id: 'u1', username: 'mert' },
      { id: 'u2', username: 'toly' },
    ]);
    const mertTimeline = makeTimelineResponse([
      makeTweet('t1', '$SOL infra week', 'u1', 100, 50, 10), // engagement = 160
    ]);
    const tolyTimeline = makeTimelineResponse([
      makeTweet('t2', '$SOL validator updates', 'u2', 200, 80, 20), // engagement = 300
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mertTimeline) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(tolyTimeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.totalEngagement).toBe(460); // 160 + 300
    expect(sol.uniqueAuthors).toBe(2);
    expect(sol.tweetCount).toBe(2);

    vi.unstubAllGlobals();
  });

  it('should track verified authors', async () => {
    const userLookup = makeUserLookupResponse([
      { id: 'u1', username: 'mert', verified: true },
      { id: 'u2', username: 'random', verified: false },
    ]);
    const mertTimeline = makeTimelineResponse([
      makeTweet('t1', '$SOL shipping', 'u1', 50, 20, 5),
    ]);
    const randomTimeline = makeTimelineResponse([
      makeTweet('t2', '$SOL pumping', 'u2', 10, 5, 1),
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mertTimeline) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(randomTimeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.verifiedAuthors).toBe(1);
    expect(sol.uniqueAuthors).toBe(2);

    vi.unstubAllGlobals();
  });

  it('should handle 429 rate limit with retry on user lookup', async () => {
    const resetTime = String(Math.floor(Date.now() / 1000) - 10);
    const rateLimitHeaders = new Headers({ 'x-rate-limit-reset': resetTime });

    const userLookup = makeUserLookupResponse([{ id: 'u1', username: 'mert' }]);
    const timeline = makeTimelineResponse([
      makeTweet('t1', '$SOL after retry', 'u1', 10, 5, 1),
    ]);

    const mockFetch = vi.fn()
      // User lookup: rate limited then success
      .mockResolvedValueOnce({ ok: false, status: 429, headers: rateLimitHeaders })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      // Timeline
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(timeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.totalTweetsAnalyzed).toBe(1);

    vi.unstubAllGlobals();
  });

  it('should return empty signals when user lookup fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.topics).toEqual([]);
    expect(result.totalTweetsAnalyzed).toBe(0);

    vi.unstubAllGlobals();
  });

  it('should handle KOL with empty timeline gracefully', async () => {
    const userLookup = makeUserLookupResponse([
      { id: 'u1', username: 'mert' },
      { id: 'u2', username: 'toly' },
    ]);
    const mertTimeline = makeTimelineResponse([]); // empty
    const tolyTimeline = makeTimelineResponse([
      makeTweet('t1', '$SOL validator upgrades', 'u2', 50, 20, 5),
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mertTimeline) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(tolyTimeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.totalTweetsAnalyzed).toBe(1);
    expect(result.topics.length).toBeGreaterThan(0);

    vi.unstubAllGlobals();
  });

  it('should keep top 3 tweets per topic by engagement', async () => {
    const userLookup = makeUserLookupResponse([{ id: 'u1', username: 'mert' }]);
    const timeline = makeTimelineResponse([
      makeTweet('t1', '$SOL tweet 1', 'u1', 10, 5, 1),   // engagement = 16
      makeTweet('t2', '$SOL tweet 2', 'u1', 100, 50, 10), // engagement = 160
      makeTweet('t3', '$SOL tweet 3', 'u1', 50, 20, 5),   // engagement = 75
      makeTweet('t4', '$SOL tweet 4', 'u1', 5, 2, 1),     // engagement = 8
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(timeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.topTweets.length).toBe(3);
    expect(sol.topTweets[0].engagement).toBe(160);
    expect(sol.topTweets[1].engagement).toBe(75);
    expect(sol.topTweets[2].engagement).toBe(16);

    vi.unstubAllGlobals();
  });

  it('should sort topics by engagement descending', async () => {
    const userLookup = makeUserLookupResponse([{ id: 'u1', username: 'mert' }]);
    const timeline = makeTimelineResponse([
      makeTweet('t1', '$JUP looking great', 'u1', 10, 5, 1),   // JUP engagement = 16
      makeTweet('t2', '$SOL is king', 'u1', 100, 50, 10),       // SOL engagement = 160
      makeTweet('t3', '$RAY farming yields', 'u1', 30, 15, 5),  // RAY engagement = 50
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(timeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.topics[0].topic).toBe('SOL');
    expect(result.topics[1].topic).toBe('RAY');
    expect(result.topics[2].topic).toBe('JUP');

    vi.unstubAllGlobals();
  });

  it('should accept additional knownProtocols for topic matching', async () => {
    const userLookup = makeUserLookupResponse([{ id: 'u1', username: 'mert' }]);
    const timeline = makeTimelineResponse([
      makeTweet('t1', 'MyNewProtocol is building something cool on Solana', 'u1', 50, 20, 5),
    ]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(timeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7, ['MyNewProtocol']);

    const topicNames = result.topics.map(t => t.topic);
    expect(topicNames).toContain('MyNewProtocol');
    expect(topicNames).toContain('Solana');

    vi.unstubAllGlobals();
  });

  it('should use exclude=retweets,replies for timeline requests', async () => {
    const userLookup = makeUserLookupResponse([{ id: 'u1', username: 'mert' }]);
    const timeline = makeTimelineResponse([]);

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(userLookup) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(timeline) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    await collectX(7);

    // Timeline call should include exclude param
    const timelineUrl = mockFetch.mock.calls[1][0];
    expect(timelineUrl).toContain('exclude=retweets%2Creplies');

    vi.unstubAllGlobals();
  });
});
