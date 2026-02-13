import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    X_BEARER_TOKEN: 'test-bearer-token',
    X_THROTTLE_MS: 0,
    X_MAX_PAGES: 3,
    X_SEARCH_QUERIES: '(solana OR $SOL) -is:retweet lang:en',
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

function makeUser(id: string, username: string, verified = false) {
  return { id, username, verified };
}

describe('X/Twitter collector', () => {
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
    expect(result.period.start).toBeDefined();
    expect(result.period.end).toBeDefined();

    vi.unstubAllGlobals();
  });

  it('should extract topics from $CASHTAG mentions', async () => {
    const mockResponse = {
      data: [
        makeTweet('1', 'Bullish on $SOL and $JUP ecosystem', 'u1', 50, 20, 5),
        makeTweet('2', '$SOL is pumping, $RAY looking good too', 'u2', 30, 10, 3),
        makeTweet('3', 'Building on $SOL with new tools', 'u3', 20, 5, 1),
      ],
      includes: {
        users: [
          makeUser('u1', 'trader1'),
          makeUser('u2', 'trader2'),
          makeUser('u3', 'dev1'),
        ],
      },
      meta: { result_count: 3 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    // Should extract SOL, JUP, RAY as topics
    const topicNames = result.topics.map(t => t.topic);
    expect(topicNames).toContain('SOL');
    expect(topicNames).toContain('JUP');
    expect(topicNames).toContain('RAY');

    // SOL should have highest tweet count (mentioned in all 3 tweets)
    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.tweetCount).toBe(3);

    vi.unstubAllGlobals();
  });

  it('should aggregate engagement per topic correctly', async () => {
    const mockResponse = {
      data: [
        makeTweet('1', '$SOL to the moon', 'u1', 100, 50, 10), // engagement = 160
        makeTweet('2', '$SOL is great', 'u2', 20, 10, 5),      // engagement = 35
      ],
      includes: {
        users: [
          makeUser('u1', 'whale'),
          makeUser('u2', 'trader'),
        ],
      },
      meta: { result_count: 2 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.totalEngagement).toBe(195); // 160 + 35
    expect(sol.uniqueAuthors).toBe(2);
    expect(sol.tweetCount).toBe(2);

    vi.unstubAllGlobals();
  });

  it('should track verified authors', async () => {
    const mockResponse = {
      data: [
        makeTweet('1', '$SOL is amazing', 'u1', 50, 20, 5),
        makeTweet('2', '$SOL keeps building', 'u2', 30, 10, 3),
        makeTweet('3', '$SOL new ATH?', 'u3', 10, 5, 1),
      ],
      includes: {
        users: [
          makeUser('u1', 'verified_trader', true),
          makeUser('u2', 'verified_analyst', true),
          makeUser('u3', 'regular_user', false),
        ],
      },
      meta: { result_count: 3 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.verifiedAuthors).toBe(2);
    expect(sol.uniqueAuthors).toBe(3);

    vi.unstubAllGlobals();
  });

  it('should handle pagination with next_token', async () => {
    const page1 = {
      data: [makeTweet('1', '$SOL page 1', 'u1')],
      includes: { users: [makeUser('u1', 'user1')] },
      meta: { result_count: 1, next_token: 'page2token' },
    };
    const page2 = {
      data: [makeTweet('2', '$SOL page 2', 'u2')],
      includes: { users: [makeUser('u2', 'user2')] },
      meta: { result_count: 1 },
    };

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(page2) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.totalTweetsAnalyzed).toBe(2);
    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.tweetCount).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it('should handle 429 rate limit with retry', async () => {
    const resetTime = String(Math.floor(Date.now() / 1000) - 10); // in the past → minimal wait
    const rateLimitHeaders = new Headers({ 'x-rate-limit-reset': resetTime });

    const successResponse = {
      data: [makeTweet('1', '$SOL after retry', 'u1')],
      includes: { users: [makeUser('u1', 'user1')] },
      meta: { result_count: 1 },
    };

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, headers: rateLimitHeaders })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(successResponse) });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.totalTweetsAnalyzed).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it('should handle empty results gracefully', async () => {
    const emptyResponse = {
      data: undefined,
      meta: { result_count: 0 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(emptyResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.topics).toEqual([]);
    expect(result.totalTweetsAnalyzed).toBe(0);
    expect(result.topByEngagement).toEqual([]);

    vi.unstubAllGlobals();
  });

  it('should match known protocol names from knownProtocols list', async () => {
    const mockResponse = {
      data: [
        makeTweet('1', 'Jupiter is the best DEX on Solana', 'u1', 50, 20, 5),
        makeTweet('2', 'Raydium TVL is going up', 'u2', 30, 10, 3),
      ],
      includes: {
        users: [
          makeUser('u1', 'defi_user'),
          makeUser('u2', 'yield_farmer'),
        ],
      },
      meta: { result_count: 2 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7, ['Jupiter', 'Raydium', 'Marinade']);

    const topicNames = result.topics.map(t => t.topic);
    expect(topicNames).toContain('Jupiter');
    expect(topicNames).toContain('Raydium');
    // Marinade not mentioned → should not appear
    expect(topicNames).not.toContain('Marinade');

    vi.unstubAllGlobals();
  });

  it('should keep top 3 tweets per topic by engagement', async () => {
    const mockResponse = {
      data: [
        makeTweet('1', '$SOL tweet 1', 'u1', 10, 5, 1),   // engagement = 16
        makeTweet('2', '$SOL tweet 2', 'u2', 100, 50, 10), // engagement = 160
        makeTweet('3', '$SOL tweet 3', 'u3', 50, 20, 5),   // engagement = 75
        makeTweet('4', '$SOL tweet 4', 'u4', 5, 2, 1),     // engagement = 8
      ],
      includes: {
        users: [
          makeUser('u1', 'a'), makeUser('u2', 'b'),
          makeUser('u3', 'c'), makeUser('u4', 'd'),
        ],
      },
      meta: { result_count: 4 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    const sol = result.topics.find(t => t.topic === 'SOL')!;
    expect(sol.topTweets.length).toBe(3);
    // Top 3 by engagement should be: 160, 75, 16
    expect(sol.topTweets[0].engagement).toBe(160);
    expect(sol.topTweets[1].engagement).toBe(75);
    expect(sol.topTweets[2].engagement).toBe(16);

    vi.unstubAllGlobals();
  });

  it('should sort topics by engagement descending', async () => {
    const mockResponse = {
      data: [
        makeTweet('1', '$JUP looking great', 'u1', 10, 5, 1),   // JUP engagement = 16
        makeTweet('2', '$SOL is king', 'u2', 100, 50, 10),       // SOL engagement = 160
        makeTweet('3', '$RAY farming yields', 'u3', 30, 15, 5),  // RAY engagement = 50
      ],
      includes: {
        users: [
          makeUser('u1', 'a'), makeUser('u2', 'b'), makeUser('u3', 'c'),
        ],
      },
      meta: { result_count: 3 },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { collectX } = await import('../../src/tools/twitter.js');
    const result = await collectX(7);

    expect(result.topics[0].topic).toBe('SOL');
    expect(result.topics[1].topic).toBe('RAY');
    expect(result.topics[2].topic).toBe('JUP');

    vi.unstubAllGlobals();
  });
});
