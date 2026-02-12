import { describe, it, expect } from 'vitest';
import {
  msUntilNextReport,
  msToHMS,
  daysAgo,
  relativeLabel,
  freshness,
  formatExact,
} from '@/lib/temporal';

describe('msUntilNextReport', () => {
  it('returns ms until next 08:00 UTC when before report time', () => {
    const now = new Date('2026-02-12T06:00:00Z');
    const ms = msUntilNextReport(now);
    expect(ms).toBe(2 * 60 * 60 * 1000); // 2 hours
  });

  it('returns ms until next day 08:00 UTC when after report time', () => {
    const now = new Date('2026-02-12T10:00:00Z');
    const ms = msUntilNextReport(now);
    expect(ms).toBe(22 * 60 * 60 * 1000); // 22 hours
  });

  it('returns next day when exactly at report time', () => {
    const now = new Date('2026-02-12T08:00:00Z');
    const ms = msUntilNextReport(now);
    expect(ms).toBe(24 * 60 * 60 * 1000); // 24 hours
  });
});

describe('msToHMS', () => {
  it('converts ms to hours/minutes/seconds', () => {
    const result = msToHMS(3661000); // 1h 1m 1s
    expect(result).toEqual({ hours: 1, minutes: 1, seconds: 1 });
  });

  it('handles zero', () => {
    expect(msToHMS(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });

  it('clamps negative values to zero', () => {
    expect(msToHMS(-1000)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });
});

describe('daysAgo', () => {
  it('returns 0 for same day', () => {
    const now = new Date('2026-02-12T15:00:00Z');
    expect(daysAgo('2026-02-12T08:00:00Z', now)).toBe(0);
  });

  it('returns 1 for yesterday', () => {
    const now = new Date('2026-02-12T15:00:00Z');
    expect(daysAgo('2026-02-11T08:00:00Z', now)).toBe(1);
  });

  it('returns correct count for older reports', () => {
    const now = new Date('2026-02-12T15:00:00Z');
    expect(daysAgo('2026-02-05T08:00:00Z', now)).toBe(7);
  });
});

describe('relativeLabel', () => {
  const now = new Date('2026-02-12T15:00:00Z');

  it('returns "Generated today" for same day', () => {
    expect(relativeLabel('2026-02-12T08:00:00Z', now)).toBe('Generated today');
  });

  it('returns "Generated yesterday" for previous day', () => {
    expect(relativeLabel('2026-02-11T08:00:00Z', now)).toBe('Generated yesterday');
  });

  it('returns "Generated N days ago" for older', () => {
    expect(relativeLabel('2026-02-09T08:00:00Z', now)).toBe('Generated 3 days ago');
  });
});

describe('freshness', () => {
  const now = new Date('2026-02-12T15:00:00Z');

  it('returns fresh for today', () => {
    expect(freshness('2026-02-12T08:00:00Z', now)).toBe('fresh');
  });

  it('returns recent for yesterday', () => {
    expect(freshness('2026-02-11T08:00:00Z', now)).toBe('recent');
  });

  it('returns stale for older', () => {
    expect(freshness('2026-02-10T08:00:00Z', now)).toBe('stale');
  });
});

describe('formatExact', () => {
  it('formats ISO date to human-readable UTC string', () => {
    const result = formatExact('2026-02-12T08:53:00Z');
    expect(result).toContain('Feb');
    expect(result).toContain('12');
    expect(result).toContain('2026');
    expect(result).toContain('UTC');
  });
});
