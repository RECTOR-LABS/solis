import { describe, it, expect } from 'vitest';
import { buildGraphData } from '@/lib/graph';
import type { FortnightlyReport, Narrative } from '@solis/shared';

function makeNarrative(overrides: Partial<Narrative> = {}): Narrative {
  return {
    id: 'n1',
    name: 'Test Narrative',
    slug: 'test-narrative',
    description: 'A test',
    stage: 'EMERGING',
    momentum: 'accelerating',
    confidence: 75,
    signals: { leading: [], coincident: [], confirming: [], social: [] },
    relatedRepos: ['owner/repo1', 'owner/repo2'],
    relatedTokens: ['SOL', 'RAY'],
    relatedProtocols: ['Raydium'],
    ...overrides,
  };
}

function makeReport(narratives: Narrative[] = [makeNarrative()]): FortnightlyReport {
  return {
    version: '1.0',
    generatedAt: '2026-02-14T08:00:00Z',
    period: { start: '2026-01-31', end: '2026-02-14' },
    sources: [],
    signals: {
      leading: { period: { start: '', end: '' }, repos: [], anomalies: [], newRepoClusters: [] },
      coincident: {
        period: { start: '', end: '' },
        tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
        dexVolumes: { total: 0, protocols: [] },
        stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
        onchain: [],
      },
      confirming: { period: { start: '', end: '' }, tokens: [], trending: [], categoryPerformance: [] },
    },
    narratives,
    buildIdeas: [],
    meta: {
      totalReposAnalyzed: 100,
      totalProtocolsAnalyzed: 50,
      totalTokensAnalyzed: 20,
      anomaliesDetected: 5,
      narrativesIdentified: narratives.length,
      buildIdeasGenerated: 0,
      llmModel: 'test',
      llmTokensUsed: 0,
      llmCostUsd: 0,
      pipelineDurationMs: 0,
    },
  };
}

describe('buildGraphData', () => {
  it('creates narrative nodes', () => {
    const { nodes } = buildGraphData(makeReport());
    const narrativeNodes = nodes.filter(n => n.type === 'narrative');
    expect(narrativeNodes).toHaveLength(1);
    expect(narrativeNodes[0].label).toBe('Test Narrative');
    expect(narrativeNodes[0].id).toBe('n:test-narrative');
    expect(narrativeNodes[0].stage).toBe('EMERGING');
    expect(narrativeNodes[0].confidence).toBe(75);
  });

  it('creates repo nodes and links', () => {
    const { nodes, links } = buildGraphData(makeReport());
    const repoNodes = nodes.filter(n => n.type === 'repo');
    expect(repoNodes).toHaveLength(2);
    expect(repoNodes[0].label).toBe('repo1');
    const repoLinks = links.filter(l => String(l.target).startsWith('r:'));
    expect(repoLinks).toHaveLength(2);
  });

  it('creates token nodes and links', () => {
    const { nodes, links } = buildGraphData(makeReport());
    const tokenNodes = nodes.filter(n => n.type === 'token');
    expect(tokenNodes).toHaveLength(2);
    expect(tokenNodes.map(n => n.label)).toContain('SOL');
    const tokenLinks = links.filter(l => String(l.target).startsWith('t:'));
    expect(tokenLinks).toHaveLength(2);
  });

  it('creates protocol nodes and links', () => {
    const { nodes, links } = buildGraphData(makeReport());
    const protocolNodes = nodes.filter(n => n.type === 'protocol');
    expect(protocolNodes).toHaveLength(1);
    expect(protocolNodes[0].label).toBe('Raydium');
    const protocolLinks = links.filter(l => String(l.target).startsWith('p:'));
    expect(protocolLinks).toHaveLength(1);
  });

  it('deduplicates shared entities across narratives', () => {
    const report = makeReport([
      makeNarrative({ id: 'n1', slug: 'a', relatedRepos: ['owner/shared'], relatedTokens: ['SOL'], relatedProtocols: [] }),
      makeNarrative({ id: 'n2', slug: 'b', name: 'Other', relatedRepos: ['owner/shared'], relatedTokens: ['SOL'], relatedProtocols: [] }),
    ]);
    const { nodes, links } = buildGraphData(report);
    const repoNodes = nodes.filter(n => n.type === 'repo');
    expect(repoNodes).toHaveLength(1); // shared, not duplicated
    const tokenNodes = nodes.filter(n => n.type === 'token');
    expect(tokenNodes).toHaveLength(1);
    // But links from both narratives
    expect(links.filter(l => String(l.target) === 'r:owner/shared')).toHaveLength(2);
  });

  it('handles empty narratives', () => {
    const { nodes, links } = buildGraphData(makeReport([]));
    expect(nodes).toHaveLength(0);
    expect(links).toHaveLength(0);
  });

  it('limits repos per narrative to 5', () => {
    const narrative = makeNarrative({
      relatedRepos: Array.from({ length: 10 }, (_, i) => `owner/repo${i}`),
    });
    const { nodes } = buildGraphData(makeReport([narrative]));
    const repoNodes = nodes.filter(n => n.type === 'repo');
    expect(repoNodes).toHaveLength(5);
  });

  it('sizes narrative nodes by confidence', () => {
    const report = makeReport([
      makeNarrative({ slug: 'high', confidence: 90 }),
      makeNarrative({ slug: 'low', confidence: 20, id: 'n2', name: 'Low', relatedRepos: [], relatedTokens: [], relatedProtocols: [] }),
    ]);
    const { nodes } = buildGraphData(report);
    const high = nodes.find(n => n.id === 'n:high')!;
    const low = nodes.find(n => n.id === 'n:low')!;
    expect(high.size).toBeGreaterThan(low.size);
  });
});
