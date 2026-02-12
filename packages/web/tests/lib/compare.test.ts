import { describe, it, expect } from 'vitest';
import { compareReports } from '@/lib/compare';
import type { FortnightlyReport, Narrative } from '@solis/shared';

function makeNarrative(overrides: Partial<Narrative>): Narrative {
  return {
    id: 'n1',
    name: 'Test Narrative',
    slug: 'test-narrative',
    description: 'A test',
    stage: 'EARLY',
    momentum: 'stable',
    confidence: 50,
    signals: { leading: [], coincident: [], confirming: [], social: [] },
    relatedRepos: [],
    relatedTokens: [],
    relatedProtocols: [],
    ...overrides,
  };
}

function makeReport(narratives: Narrative[], metaOverrides?: Partial<FortnightlyReport['meta']>): FortnightlyReport {
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
      ...metaOverrides,
    },
  };
}

describe('compareReports', () => {
  const nA = makeNarrative({ slug: 'depin', name: 'DePIN', stage: 'EARLY', confidence: 60 });
  const nShared = makeNarrative({ slug: 'ai-agents', name: 'AI Agents', stage: 'EMERGING', confidence: 70 });

  const nB = makeNarrative({ slug: 'gaming', name: 'Gaming', stage: 'GROWING', confidence: 80 });
  const nSharedB = makeNarrative({ slug: 'ai-agents', name: 'AI Agents', stage: 'GROWING', confidence: 85 });

  const reportA = makeReport([nA, nShared]);
  const reportB = makeReport([nSharedB, nB]);

  it('detects new narratives in report B', () => {
    const result = compareReports(reportA, reportB, '2026-02-01', '2026-02-12');
    expect(result.newNarratives).toHaveLength(1);
    expect(result.newNarratives[0].slug).toBe('gaming');
  });

  it('detects removed narratives from report A', () => {
    const result = compareReports(reportA, reportB, '2026-02-01', '2026-02-12');
    expect(result.removedNarratives).toHaveLength(1);
    expect(result.removedNarratives[0].slug).toBe('depin');
  });

  it('identifies shared narratives with correct deltas', () => {
    const result = compareReports(reportA, reportB, '2026-02-01', '2026-02-12');
    expect(result.shared).toHaveLength(1);
    const shared = result.shared[0];
    expect(shared.slug).toBe('ai-agents');
    expect(shared.stageA).toBe('EMERGING');
    expect(shared.stageB).toBe('GROWING');
    expect(shared.stageChanged).toBe(true);
    expect(shared.confidenceDelta).toBe(15); // 85 - 70
  });

  it('calculates meta deltas correctly', () => {
    const rA = makeReport([nA], { narrativesIdentified: 5, anomaliesDetected: 3, totalReposAnalyzed: 100, buildIdeasGenerated: 4 });
    const rB = makeReport([nB], { narrativesIdentified: 8, anomaliesDetected: 2, totalReposAnalyzed: 120, buildIdeasGenerated: 6 });
    const result = compareReports(rA, rB, '2026-02-01', '2026-02-12');
    expect(result.metaDeltas.narratives.delta).toBe(3);
    expect(result.metaDeltas.anomalies.delta).toBe(-1);
    expect(result.metaDeltas.repos.delta).toBe(20);
    expect(result.metaDeltas.ideas.delta).toBe(2);
  });

  it('handles identical reports', () => {
    const result = compareReports(reportA, reportA, '2026-02-01', '2026-02-01');
    expect(result.newNarratives).toHaveLength(0);
    expect(result.removedNarratives).toHaveLength(0);
    expect(result.shared).toHaveLength(2);
    result.shared.forEach(s => {
      expect(s.stageChanged).toBe(false);
      expect(s.confidenceDelta).toBe(0);
    });
  });

  it('preserves date labels', () => {
    const result = compareReports(reportA, reportB, '2026-02-01', '2026-02-12');
    expect(result.dateA).toBe('2026-02-01');
    expect(result.dateB).toBe('2026-02-12');
  });
});
