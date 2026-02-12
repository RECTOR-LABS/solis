// Temporal utilities for report freshness and countdown
// Pure functions — no React, all accept optional `now` for testability

const REPORT_HOUR_UTC = 8;

export function msUntilNextReport(now: Date = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(REPORT_HOUR_UTC, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function msToHMS(ms: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function daysAgo(isoDate: string, now: Date = new Date()): number {
  const report = new Date(isoDate);
  const reportDay = Date.UTC(report.getUTCFullYear(), report.getUTCMonth(), report.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - reportDay) / (1000 * 60 * 60 * 24));
}

export function relativeLabel(isoDate: string, now: Date = new Date()): string {
  const days = daysAgo(isoDate, now);
  if (days === 0) return 'Generated today';
  if (days === 1) return 'Generated yesterday';
  return `Generated ${days} days ago`;
}

export type Freshness = 'fresh' | 'recent' | 'stale';

export function freshness(isoDate: string, now: Date = new Date()): Freshness {
  const days = daysAgo(isoDate, now);
  if (days === 0) return 'fresh';
  if (days === 1) return 'recent';
  return 'stale';
}

export function formatExact(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(isoDate));
}
