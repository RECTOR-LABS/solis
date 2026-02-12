import { describe, it, expect } from 'vitest';
import { buildNarrativeTimeline } from '@/lib/timeline';
import type { FortnightlyReport, Narrative } from '@solis/shared';

function makeNarrative(overrides: Partial<Narrative>): Narrative {
  return {
    id: 'n1',
    name: 'DePIN Expansion',
    slug: 'depin-expansion',
    description: 'Growing DePIN ecosystem',
    stage: 'EARLY',
    momentum: 'stable',
    confidence: 50,
    signals: { leading: [], coincident: [], confirming: [] },
    relatedRepos: [],
    relatedTokens: [],
    relatedProtocols: [],
    ...overrides,
  };
}

function makeReport(narratives: Narrative[]): FortnightlyReport {
  return {
    version: '1.0',
    generatedAt: '2026-02-12T08:00:00Z',
    period: { start: '2026-01-29', end: '2026-02-12' },
    sources: [],
    signals: { leading: {} as any, coincident: {} as any, confirming: {} as any },
    narratives,
    buildIdeas: [],
    meta: {
      totalReposAnalyzed: 100,
      totalProtocolsAnalyzed: 50,
      totalTokensAnalyzed: 30,
      anomaliesDetected: 5,
      narrativesIdentified: narratives.length,
      buildIdeasGenerated: 3,
      llmModel: 'test',
      llmTokensUsed: 1000,
      llmCostUsd: 0.01,
      pipelineDurationMs: 5000,
    },
  };
}

describe('buildNarrativeTimeline', () => {
  const slug = 'depin-expansion';

  it('builds timeline across multiple reports', () => {
    const reports = [
      { date: '2026-02-01', report: makeReport([makeNarrative({ stage: 'EARLY', confidence: 40 })]) },
      { date: '2026-02-05', report: makeReport([makeNarrative({ stage: 'EMERGING', confidence: 60 })]) },
      { date: '2026-02-12', report: makeReport([makeNarrative({ stage: 'GROWING', confidence: 85 })]) },
    ];

    const timeline = buildNarrativeTimeline(slug, reports);
    expect(timeline).not.toBeNull();
    expect(timeline!.points).toHaveLength(3);
    expect(timeline!.firstSeen).toBe('2026-02-01');
    expect(timeline!.lastSeen).toBe('2026-02-12');
  });

  it('detects stage transitions', () => {
    const reports = [
      { date: '2026-02-01', report: makeReport([makeNarrative({ stage: 'EARLY', confidence: 40 })]) },
      { date: '2026-02-05', report: makeReport([makeNarrative({ stage: 'EMERGING', confidence: 60 })]) },
      { date: '2026-02-12', report: makeReport([makeNarrative({ stage: 'GROWING', confidence: 85 })]) },
    ];

    const timeline = buildNarrativeTimeline(slug, reports);
    expect(timeline!.stageTransitions).toHaveLength(2);
    expect(timeline!.stageTransitions[0]).toEqual({
      date: '2026-02-05',
      from: 'EARLY',
      to: 'EMERGING',
    });
    expect(timeline!.stageTransitions[1]).toEqual({
      date: '2026-02-12',
      from: 'EMERGING',
      to: 'GROWING',
    });
  });

  it('calculates peak confidence', () => {
    const reports = [
      { date: '2026-02-01', report: makeReport([makeNarrative({ confidence: 40 })]) },
      { date: '2026-02-05', report: makeReport([makeNarrative({ confidence: 90 })]) },
      { date: '2026-02-12', report: makeReport([makeNarrative({ confidence: 70 })]) },
    ];

    const timeline = buildNarrativeTimeline(slug, reports);
    expect(timeline!.peakConfidence).toBe(90);
  });

  it('handles single report', () => {
    const reports = [
      { date: '2026-02-12', report: makeReport([makeNarrative({ stage: 'EARLY', confidence: 50 })]) },
    ];

    const timeline = buildNarrativeTimeline(slug, reports);
    expect(timeline).not.toBeNull();
    expect(timeline!.points).toHaveLength(1);
    expect(timeline!.firstSeen).toBe('2026-02-12');
    expect(timeline!.lastSeen).toBe('2026-02-12');
    expect(timeline!.stageTransitions).toHaveLength(0);
  });

  it('returns null for unknown slug', () => {
    const reports = [
      { date: '2026-02-12', report: makeReport([makeNarrative({})]) },
    ];

    const timeline = buildNarrativeTimeline('nonexistent', reports);
    expect(timeline).toBeNull();
  });

  it('skips reports where narrative is absent', () => {
    const reports = [
      { date: '2026-02-01', report: makeReport([makeNarrative({ confidence: 40 })]) },
      { date: '2026-02-05', report: makeReport([]) }, // narrative missing
      { date: '2026-02-12', report: makeReport([makeNarrative({ confidence: 80 })]) },
    ];

    const timeline = buildNarrativeTimeline(slug, reports);
    expect(timeline!.points).toHaveLength(2);
    expect(timeline!.points[0].date).toBe('2026-02-01');
    expect(timeline!.points[1].date).toBe('2026-02-12');
  });

  it('sorts reports chronologically regardless of input order', () => {
    const reports = [
      { date: '2026-02-12', report: makeReport([makeNarrative({ confidence: 80 })]) },
      { date: '2026-02-01', report: makeReport([makeNarrative({ confidence: 40 })]) },
    ];

    const timeline = buildNarrativeTimeline(slug, reports);
    expect(timeline!.points[0].date).toBe('2026-02-01');
    expect(timeline!.points[1].date).toBe('2026-02-12');
  });
});
