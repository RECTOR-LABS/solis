import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildDigestHtml } from '@/lib/digest-template';
import type { FortnightlyReport } from '@solis/shared';

const ORIGINAL_ENV = { ...process.env };

const mockReport: FortnightlyReport = {
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
  narratives: [
    {
      id: 'n1', name: 'DePIN Growth', slug: 'depin', description: 'DePIN expanding rapidly',
      stage: 'EMERGING', momentum: 'accelerating', confidence: 85,
      signals: { leading: ['s1'], coincident: [], confirming: [], social: [] },
      relatedRepos: [], relatedTokens: [], relatedProtocols: [],
    },
    {
      id: 'n2', name: 'MEV Innovation', slug: 'mev', description: 'New MEV strategies emerging',
      stage: 'EARLY', momentum: 'stable', confidence: 60,
      signals: { leading: [], coincident: ['s2'], confirming: [], social: [] },
      relatedRepos: [], relatedTokens: [], relatedProtocols: [],
    },
    {
      id: 'n3', name: 'Liquid Staking', slug: 'lst', description: 'LST adoption increasing',
      stage: 'GROWING', momentum: 'accelerating', confidence: 78,
      signals: { leading: [], coincident: [], confirming: ['s3'], social: [] },
      relatedRepos: [], relatedTokens: [], relatedProtocols: [],
    },
    {
      id: 'n4', name: 'Low Confidence', slug: 'low', description: 'Not in top 3',
      stage: 'EARLY', momentum: 'decelerating', confidence: 30,
      signals: { leading: [], coincident: [], confirming: [], social: [] },
      relatedRepos: [], relatedTokens: [], relatedProtocols: [],
    },
  ],
  buildIdeas: [],
  diff: {
    newNarratives: ['DePIN Growth'],
    removedNarratives: ['Old Signal'],
    stageTransitions: [{ name: 'Liquid Staking', from: 'EMERGING', to: 'GROWING' }],
    confidenceChanges: [],
  },
  meta: {
    totalReposAnalyzed: 103,
    totalProtocolsAnalyzed: 45,
    totalTokensAnalyzed: 20,
    anomaliesDetected: 7,
    narrativesIdentified: 4,
    buildIdeasGenerated: 5,
    llmModel: 'test',
    llmTokensUsed: 1000,
    llmCostUsd: 0.01,
    pipelineDurationMs: 5000,
  },
};

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.DIGEST_UNSUBSCRIBE_SECRET = 'test-secret';
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

describe('buildDigestHtml', () => {
  it('renders valid HTML', () => {
    const html = buildDigestHtml({
      report: mockReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: 'https://solis.rectorspace.com/api/subscribe?email=test@test.com&token=abc',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes top 3 narratives sorted by confidence', () => {
    const html = buildDigestHtml({
      report: mockReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: 'https://example.com/unsub',
    });
    expect(html).toContain('DePIN Growth');
    expect(html).toContain('Liquid Staking');
    expect(html).toContain('MEV Innovation');
    expect(html).not.toContain('Low Confidence'); // not in top 3
  });

  it('includes diff section when diff exists', () => {
    const html = buildDigestHtml({
      report: mockReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: 'https://example.com/unsub',
    });
    expect(html).toContain('What Changed');
    expect(html).toContain('1</strong> new narrative');
    expect(html).toContain('1</strong> faded');
    expect(html).toContain('1</strong> stage transition');
  });

  it('omits diff section when no diff', () => {
    const noDiffReport = { ...mockReport, diff: undefined };
    const html = buildDigestHtml({
      report: noDiffReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: 'https://example.com/unsub',
    });
    expect(html).not.toContain('What Changed');
  });

  it('includes report date in header', () => {
    const html = buildDigestHtml({
      report: mockReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: 'https://example.com/unsub',
    });
    expect(html).toContain('2026-02-14');
  });

  it('includes unsubscribe link', () => {
    const url = 'https://solis.rectorspace.com/api/subscribe?email=x&token=y';
    const html = buildDigestHtml({
      report: mockReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: url,
    });
    expect(html).toContain(url);
    expect(html).toContain('Unsubscribe');
  });

  it('includes CTA link to full report', () => {
    const html = buildDigestHtml({
      report: mockReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: 'https://example.com/unsub',
    });
    expect(html).toContain('solis.rectorspace.com/report/2026-02-14');
    expect(html).toContain('View Full Report');
  });

  it('escapes HTML in narrative content', () => {
    const xssReport = {
      ...mockReport,
      narratives: [{
        ...mockReport.narratives[0],
        name: '<script>alert("xss")</script>',
        description: 'Safe & sound "always"',
      }],
    };
    const html = buildDigestHtml({
      report: xssReport,
      reportDate: '2026-02-14',
      unsubscribeUrl: 'https://example.com/unsub',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Safe &amp; sound');
  });
});
