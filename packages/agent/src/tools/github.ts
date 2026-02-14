import { env } from '../config.js';
import { logger } from '../logger.js';
import type { CacheStore } from '../cache/index.js';
import type { GitHubRepoSignal, GitHubSignals } from '@solis/shared';

export const GITHUB_API = 'https://api.github.com';

interface GitHubApiRepo {
  full_name: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
}

interface GitHubApiCommitActivity {
  total: number;
  week: number;
}

export async function ghFetch<T>(path: string): Promise<T | null> {
  const url = `${GITHUB_API}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    const latency = Date.now() - start;
    if (!res.ok) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      logger.warn({ path, status: res.status, remaining, latency }, 'GitHub API error');
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    logger.error({ path, error: err, latency: Date.now() - start }, 'GitHub fetch failed');
    return null;
  }
}

async function getRepoInfo(owner: string, name: string): Promise<GitHubApiRepo | null> {
  return ghFetch<GitHubApiRepo>(`/repos/${owner}/${name}`);
}

async function getCommitActivity(owner: string, name: string): Promise<GitHubApiCommitActivity[] | null> {
  return ghFetch<GitHubApiCommitActivity[]>(`/repos/${owner}/${name}/stats/commit_activity`);
}

async function getContributorCount(owner: string, name: string): Promise<number> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${name}/contributors?per_page=1&anon=true`, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) return 0;

  const link = res.headers.get('link');
  if (!link) {
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  }

  const match = link.match(/page=(\d+)>;\s*rel="last"/);
  return match ? parseInt(match[1], 10) : 1;
}

async function fetchRepoSignal(
  repo: string,
  periodWeeks: number,
): Promise<GitHubRepoSignal | null> {
  const [owner, name] = repo.split('/');
  if (!owner || !name) return null;

  const [info, commitActivity, contributors] = await Promise.all([
    getRepoInfo(owner, name),
    getCommitActivity(owner, name),
    getContributorCount(owner, name),
  ]);

  if (!info) return null;

  // GitHub returns 202 (empty/object) when stats are being computed — guard with Array.isArray
  const activity = Array.isArray(commitActivity) ? commitActivity : [];
  const recentCommits = activity
    .slice(-periodWeeks)
    .reduce((sum, w) => sum + w.total, 0);
  const priorCommits = activity
    .slice(-(periodWeeks * 2), -periodWeeks)
    .reduce((sum, w) => sum + w.total, 0);

  const createdAt = new Date(info.created_at);
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - periodWeeks * 7);

  return {
    repo: info.full_name,
    stars: info.stargazers_count,
    starsDelta: 0,
    starsZScore: 0,
    commits: recentCommits,
    commitsDelta: recentCommits - priorCommits,
    commitsZScore: 0,
    forks: info.forks_count,
    forksDelta: 0,
    forksZScore: 0,
    contributors,
    contributorsDelta: 0,
    newRepo: createdAt > periodStart,
    language: info.language ?? 'Unknown',
    topics: info.topics ?? [],
  };
}

export async function collectGitHub(
  repos: string[],
  periodWeeks: number = 2,
  cache?: CacheStore,
): Promise<GitHubSignals> {
  const log = logger.child({ tool: 'github' });

  const cacheKey = new Date().toISOString().split('T')[0];
  if (cache) {
    const cached = await cache.get<GitHubSignals>('github', cacheKey);
    if (cached) return cached;
  }

  log.info({ repoCount: repos.length, periodWeeks }, 'Collecting GitHub signals');

  const BATCH_SIZE = 10;
  const signals: GitHubRepoSignal[] = [];

  for (let i = 0; i < repos.length; i += BATCH_SIZE) {
    const batch = repos.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(repo => fetchRepoSignal(repo, periodWeeks)),
    );
    for (const r of results) {
      if (r) signals.push(r);
    }

    if (i + BATCH_SIZE < repos.length) {
      await new Promise(resolve => setTimeout(resolve, env.GITHUB_THROTTLE_MS));
    }
  }

  log.info({ collected: signals.length, total: repos.length }, 'GitHub collection complete');

  const now = new Date();
  const periodStart = new Date();
  periodStart.setDate(now.getDate() - periodWeeks * 7);

  const result: GitHubSignals = {
    period: {
      start: periodStart.toISOString(),
      end: now.toISOString(),
    },
    repos: signals,
    anomalies: [],
    newRepoClusters: [],
  };

  if (cache) await cache.set('github', cacheKey, result, env.CACHE_TTL_HOURS);
  return result;
}
