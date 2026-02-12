import { logger } from '../logger.js';
import { ghFetch } from '../tools/github.js';
import { withRetry } from '../utils/retry.js';
import { getCuratedRepoSet, CURATED_REPOS, type TrackedRepo } from './curated.js';

// GitHub Search API response shape (only fields we use)
interface SearchItem {
  full_name: string;
  archived: boolean;
  stargazers_count: number;
  topics: string[];
}

interface SearchResponse {
  total_count: number;
  items: SearchItem[];
}

// Map GitHub topics → existing SOLIS category taxonomy
const TOPIC_CATEGORY_MAP: Record<string, string> = {
  // Core
  'solana-program': 'core',
  'solana-sdk': 'core',
  'anchor-framework': 'core',

  // DeFi
  'defi': 'defi-dex',
  'dex': 'defi-dex',
  'amm': 'defi-dex',
  'lending': 'defi-lending',
  'borrowing': 'defi-lending',
  'liquid-staking': 'lst',
  'staking': 'lst',
  'perpetuals': 'defi-perps',
  'derivatives': 'defi-perps',
  'yield': 'defi-yield',
  'vault': 'defi-yield',

  // Infrastructure
  'oracle': 'oracle',
  'bridge': 'bridge',
  'cross-chain': 'bridge',
  'interoperability': 'bridge',

  // NFT & Digital Assets
  'nft': 'nft',
  'metaplex': 'nft',
  'digital-assets': 'nft',
  'compressed-nft': 'compression',

  // Verticals
  'depin': 'depin',
  'gaming': 'gaming',
  'social': 'social',
  'identity': 'social',
  'governance': 'governance',
  'dao': 'governance',
  'payments': 'payments',
  'wallet': 'wallet',
  'mev': 'mev',
  'privacy': 'privacy',
  'mobile': 'mobile',
  'svm': 'svm',
  'rollup': 'svm',
  'blinks': 'blinks',
  'actions': 'blinks',
  'restaking': 'restaking',

  // Dev Tools
  'sdk': 'devtools',
  'developer-tools': 'devtools',
  'solana-tools': 'devtools',

  // Education
  'education': 'education',
  'tutorial': 'education',
};

/**
 * Infer a SOLIS category from GitHub topics.
 * First matching topic wins; falls back to 'discovered'.
 */
export function inferCategory(topics: string[]): string {
  for (const topic of topics) {
    const cat = TOPIC_CATEGORY_MAP[topic.toLowerCase()];
    if (cat) return cat;
  }
  return 'discovered';
}

/**
 * Filter out archived or malformed repos from search results.
 */
export function filterValid(items: SearchItem[]): SearchItem[] {
  return items.filter(item => {
    if (item.archived) return false;
    const parts = item.full_name.split('/');
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  });
}

/**
 * Convert GitHub search items to TrackedRepo format.
 * All discovered repos get weight: 1.
 */
export function toTrackedRepos(items: SearchItem[]): TrackedRepo[] {
  return items.map(item => ({
    repo: item.full_name,
    category: inferCategory(item.topics ?? []),
    weight: 1,
  }));
}

/**
 * Merge curated and discovered repos.
 * Curated always wins on duplicates (preserves hand-picked category + weight).
 * Dedup is case-insensitive.
 */
export function mergeRepos(curated: TrackedRepo[], discovered: TrackedRepo[]): TrackedRepo[] {
  const seen = new Set(curated.map(r => r.repo.toLowerCase()));
  const merged = [...curated];

  for (const repo of discovered) {
    const key = repo.repo.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(repo);
    }
  }

  return merged;
}

const MAX_PAGES = 3;
const PER_PAGE = 100;
const PAGE_DELAY_MS = 2000;

/**
 * Search GitHub for trending Solana repos above a minimum star threshold.
 * Fetches up to 3 pages (300 repos), sorted by recently updated.
 */
async function searchSolanaRepos(minStars: number): Promise<SearchItem[]> {
  const log = logger.child({ component: 'discovery' });
  const allItems: SearchItem[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const path = `/search/repositories?q=topic:solana+stars:>=${minStars}+archived:false&sort=updated&order=desc&per_page=${PER_PAGE}&page=${page}`;

    const result = await withRetry(
      async () => {
        const data = await ghFetch<SearchResponse>(path);
        if (!data) throw new Error(`GitHub search returned null (page ${page})`);
        return data;
      },
      `discovery-search-page-${page}`,
      { attempts: 2, baseDelayMs: 2000 },
    );

    allItems.push(...result.items);
    log.info({ page, fetched: result.items.length, total: result.total_count }, 'Discovery search page');

    if (result.items.length < PER_PAGE) break;
    if (page < MAX_PAGES) {
      await new Promise(resolve => setTimeout(resolve, PAGE_DELAY_MS));
    }
  }

  return allItems;
}

/**
 * Top-level discovery orchestrator.
 * Searches GitHub, filters, deduplicates against curated list, and returns merged repo list.
 */
export async function discoverRepos(minStars: number): Promise<{
  allRepos: TrackedRepo[];
  discoveredCount: number;
}> {
  const log = logger.child({ component: 'discovery' });
  log.info({ minStars }, 'Starting repo discovery');

  const raw = await searchSolanaRepos(minStars);
  const valid = filterValid(raw);
  const discovered = toTrackedRepos(valid);

  // Dedup against curated
  const curatedSet = getCuratedRepoSet();
  const netNew = discovered.filter(r => !curatedSet.has(r.repo.toLowerCase()));

  const allRepos = mergeRepos(CURATED_REPOS, netNew);

  log.info({
    searched: raw.length,
    valid: valid.length,
    netNew: netNew.length,
    total: allRepos.length,
  }, 'Discovery complete');

  return { allRepos, discoveredCount: netNew.length };
}
