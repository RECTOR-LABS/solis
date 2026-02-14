import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { logger } from '../logger.js';
import type { GitHubRepoSignal } from '@solis/shared';

export interface StarSnapshot {
  date: string;
  stars: number;
}

export type StarHistory = Record<string, StarSnapshot[]>;

const log = logger.child({ component: 'star-history' });

export async function recordStars(
  repos: Array<{ repo: string; stars: number }>,
  date: string,
  historyPath: string,
): Promise<void> {
  const history = await loadStarHistory(historyPath);

  for (const { repo, stars } of repos) {
    if (!history[repo]) history[repo] = [];
    const snapshots = history[repo];

    // Avoid duplicate entries for the same date
    const existing = snapshots.findIndex(s => s.date === date);
    if (existing >= 0) {
      snapshots[existing].stars = stars;
    } else {
      snapshots.push({ date, stars });
    }
  }

  await mkdir(dirname(historyPath), { recursive: true });
  await writeFile(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  log.info({ repos: repos.length, date }, 'Star history recorded');
}

export async function loadStarHistory(historyPath: string): Promise<StarHistory> {
  try {
    const raw = await readFile(historyPath, 'utf-8');
    return JSON.parse(raw) as StarHistory;
  } catch {
    return {};
  }
}

export function enrichWithStarHistory(
  repos: GitHubRepoSignal[],
  history: StarHistory,
  date: string,
): void {
  const today = new Date(date);

  for (const repo of repos) {
    const snapshots = history[repo.repo];
    if (!snapshots || snapshots.length < 2) continue;

    // Sort by date ascending
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));

    const todayStars = repo.stars;

    // Find closest snapshot to 7 days ago
    const target7d = new Date(today);
    target7d.setDate(target7d.getDate() - 7);
    const snap7d = findClosestSnapshot(sorted, target7d);

    // Find closest snapshot to 30 days ago
    const target30d = new Date(today);
    target30d.setDate(target30d.getDate() - 30);
    const snap30d = findClosestSnapshot(sorted, target30d);

    if (snap7d) {
      repo.stars7d = todayStars - snap7d.stars;
      repo.starsVelocity = repo.stars7d / 7;
    }

    if (snap30d) {
      repo.stars30d = todayStars - snap30d.stars;
    }
  }

  const enriched = repos.filter(r => r.stars7d !== undefined).length;
  if (enriched > 0) {
    log.info({ enriched, total: repos.length }, 'Repos enriched with star history');
  }
}

function findClosestSnapshot(
  sorted: StarSnapshot[],
  target: Date,
): StarSnapshot | null {
  const targetStr = target.toISOString().split('T')[0];

  // Find snapshots on or before the target date
  const candidates = sorted.filter(s => s.date <= targetStr);
  if (candidates.length === 0) return null;

  // Return the most recent one before target
  return candidates[candidates.length - 1];
}
