import { describe, it, expect } from 'vitest';
import { matchNarratives, populateHistory, computeReportDiff } from '../../src/utils/history.js';
import type { Narrative, SignalStage, MomentumDirection } from '@solis/shared';

function makeNarrative(overrides: Partial<Narrative> = {}): Narrative {
  return {
    id: 'n-1',
    name: 'Test Narrative',
    slug: 'test-narrative',
    description: 'A test',
    stage: 'EMERGING' as SignalStage,
    momentum: 'stable' as MomentumDirection,
    confidence: 75,
    signals: { leading: [], coincident: [], confirming: [], social: [] },
    relatedRepos: [],
    relatedTokens: [],
    relatedProtocols: [],
    ...overrides,
  };
}

describe('matchNarratives', () => {
  it('matches by exact slug', () => {
    const current = [makeNarrative({ slug: 'depin-expansion', name: 'DePIN Expansion' })];
    const previous = [makeNarrative({ slug: 'depin-expansion', name: 'DePIN Expansion' })];

    const matches = matchNarratives(current, previous);

    expect(matches).toHaveLength(1);
    expect(matches[0].previous).not.toBeNull();
    expect(matches[0].previous!.slug).toBe('depin-expansion');
  });

  it('matches by fuzzy name similarity', () => {
    const current = [makeNarrative({ slug: 'solana-depin-growth', name: 'Solana DePIN Growth' })];
    const previous = [makeNarrative({ slug: 'depin-expansion', name: 'DePIN Expansion Growth' })];

    const matches = matchNarratives(current, previous);

    expect(matches).toHaveLength(1);
    expect(matches[0].previous).not.toBeNull();
  });

  it('returns null for unmatched narratives', () => {
    const current = [makeNarrative({ slug: 'new-thing', name: 'Brand New Narrative' })];
    const previous = [makeNarrative({ slug: 'old-thing', name: 'Completely Different Topic' })];

    const matches = matchNarratives(current, previous);

    expect(matches[0].previous).toBeNull();
  });

  it('does not double-match a previous narrative', () => {
    const prev = makeNarrative({ slug: 'depin', name: 'DePIN' });
    const current = [
      makeNarrative({ slug: 'depin', name: 'DePIN' }),
      makeNarrative({ slug: 'depin-v2', name: 'DePIN V2' }),
    ];

    const matches = matchNarratives(current, [prev]);

    const matchedPrev = matches.filter(m => m.previous !== null);
    expect(matchedPrev).toHaveLength(1);
    expect(matchedPrev[0].current.slug).toBe('depin');
  });
});

describe('populateHistory', () => {
  it('marks new narratives with isNew=true', () => {
    const current = [makeNarrative({ slug: 'brand-new', name: 'Brand New' })];
    const previous = [makeNarrative({ slug: 'old-one', name: 'Old One' })];

    populateHistory(current, previous, '2026-02-12T08:00:00Z');

    expect(current[0].isNew).toBe(true);
    expect(current[0].previousStage).toBeUndefined();
  });

  it('populates previousStage for matched narratives', () => {
    const current = [makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'GROWING' })];
    const previous = [makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'EMERGING' })];

    populateHistory(current, previous, '2026-02-12T08:00:00Z');

    expect(current[0].isNew).toBe(false);
    expect(current[0].previousStage).toBe('EMERGING');
    expect(current[0].stageChangedAt).toBe('2026-02-12T08:00:00Z');
  });

  it('does not set stageChangedAt when stage unchanged', () => {
    const current = [makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'EMERGING' })];
    const previous = [makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'EMERGING' })];

    populateHistory(current, previous, '2026-02-12T08:00:00Z');

    expect(current[0].isNew).toBe(false);
    expect(current[0].previousStage).toBe('EMERGING');
    expect(current[0].stageChangedAt).toBeUndefined();
  });
});

describe('computeReportDiff', () => {
  it('identifies new narratives', () => {
    const current = [makeNarrative({ slug: 'new-one', name: 'New One' })];
    const previous = [makeNarrative({ slug: 'old-one', name: 'Old One' })];

    const diff = computeReportDiff(current, previous);

    expect(diff.newNarratives).toEqual(['New One']);
  });

  it('identifies removed narratives', () => {
    const current = [makeNarrative({ slug: 'kept', name: 'Kept' })];
    const previous = [
      makeNarrative({ slug: 'kept', name: 'Kept' }),
      makeNarrative({ slug: 'gone', name: 'Gone Away' }),
    ];

    const diff = computeReportDiff(current, previous);

    expect(diff.removedNarratives).toEqual(['Gone Away']);
  });

  it('identifies stage transitions', () => {
    const current = [makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'GROWING' })];
    const previous = [makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'EARLY' })];

    const diff = computeReportDiff(current, previous);

    expect(diff.stageTransitions).toEqual([
      { name: 'DePIN', from: 'EARLY', to: 'GROWING' },
    ]);
  });

  it('tracks confidence changes', () => {
    const current = [makeNarrative({ slug: 'depin', name: 'DePIN', confidence: 90 })];
    const previous = [makeNarrative({ slug: 'depin', name: 'DePIN', confidence: 75 })];

    const diff = computeReportDiff(current, previous);

    expect(diff.confidenceChanges).toEqual([
      { name: 'DePIN', delta: 15 },
    ]);
  });

  it('returns empty diff for identical reports', () => {
    const narratives = [makeNarrative({ slug: 'depin', name: 'DePIN' })];

    const diff = computeReportDiff(narratives, narratives);

    expect(diff.newNarratives).toEqual([]);
    expect(diff.removedNarratives).toEqual([]);
    expect(diff.stageTransitions).toEqual([]);
    expect(diff.confidenceChanges).toEqual([]);
  });
});
