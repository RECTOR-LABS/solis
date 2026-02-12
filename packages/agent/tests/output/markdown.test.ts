import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FortnightlyReport, Narrative, BuildIdea } from '@solis/shared';

const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs/promises', () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

vi.mock('../../src/config.js', () => ({
  env: { REPORTS_DIR: '/tmp/solis-reports' },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { writeMarkdownReport } from '../../src/output/markdown.js';

// --- Fixtures ---

function makeNarrative(overrides: Partial<Narrative> = {}): Narrative {
  return {
    id: 'n1',
    name: 'Test Narrative',
    slug: 'test-narrative',
    description: 'A test narrative description',
    stage: 'EMERGING',
    momentum: 'accelerating',
    confidence: 75,
    signals: {
      leading: ['GitHub signal 1'],
      coincident: ['TVL signal 1'],
      confirming: ['Price signal 1'],
      social: [],
    },
    relatedRepos: ['owner/repo1'],
    relatedTokens: ['SOL'],
    relatedProtocols: ['Jupiter'],
    ...overrides,
  };
}

function makeBuildIdea(overrides: Partial<BuildIdea> = {}): BuildIdea {
  return {
    id: 'b1',
    title: 'Test Idea',
    narrative: 'n1',
    description: 'Build a test thing',
    difficulty: 'intermediate',
    timeframe: '2-4 weeks',
    techStack: ['TypeScript', 'Anchor'],
    existingProjects: ['ref/project'],
    whyNow: 'The timing is right',
    ...overrides,
  };
}

function makeReport(overrides: Partial<FortnightlyReport> = {}): FortnightlyReport {
  return {
    version: '1.0',
    generatedAt: '2026-02-12T00:00:00Z',
    period: { start: '2026-01-29T00:00:00Z', end: '2026-02-12T00:00:00Z' },
    sources: [
      { name: 'GitHub', layer: 'LEADING', fetchedAt: '2026-02-12T00:00:00Z', dataPoints: 100 },
      { name: 'DeFi Llama', layer: 'COINCIDENT', fetchedAt: '2026-02-12T00:00:00Z', dataPoints: 50 },
    ],
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
    narratives: [makeNarrative()],
    buildIdeas: [makeBuildIdea()],
    meta: {
      totalReposAnalyzed: 50,
      totalProtocolsAnalyzed: 20,
      totalTokensAnalyzed: 30,
      anomaliesDetected: 5,
      narrativesIdentified: 1,
      buildIdeasGenerated: 1,
      llmModel: 'test',
      llmTokensUsed: 1000,
      llmCostUsd: 0.01,
      pipelineDurationMs: 5000,
    },
    ...overrides,
  };
}

describe('writeMarkdownReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Helper function tests (via full report output) ---

  it('should map stage emojis correctly', async () => {
    const report = makeReport({
      narratives: [
        makeNarrative({ name: 'Early', stage: 'EARLY' }),
        makeNarrative({ name: 'Emerging', stage: 'EMERGING' }),
        makeNarrative({ name: 'Growing', stage: 'GROWING' }),
        makeNarrative({ name: 'Mainstream', stage: 'MAINSTREAM' }),
      ],
    });
    await writeMarkdownReport(report, '2026-02-12');

    const md = mockWriteFile.mock.calls[0][1] as string;
    expect(md).toContain('🔵 Early');
    expect(md).toContain('🟡 Emerging');
    expect(md).toContain('🟠 Growing');
    expect(md).toContain('🔴 Mainstream');
  });

  it('should map momentum arrows correctly', async () => {
    const report = makeReport({
      narratives: [
        makeNarrative({ momentum: 'accelerating' }),
        makeNarrative({ name: 'Stable', momentum: 'stable' }),
        makeNarrative({ name: 'Decel', momentum: 'decelerating' }),
      ],
    });
    await writeMarkdownReport(report, '2026-02-12');

    const md = mockWriteFile.mock.calls[0][1] as string;
    expect(md).toContain('↑ accelerating');
    expect(md).toContain('→ stable');
    expect(md).toContain('↓ decelerating');
  });

  it('should render narrative with stage, momentum, confidence, and signal sections', async () => {
    await writeMarkdownReport(makeReport(), '2026-02-12');

    const md = mockWriteFile.mock.calls[0][1] as string;
    expect(md).toContain('**Stage:** EMERGING');
    expect(md).toContain('**Confidence:** 75%');
    expect(md).toContain('**Leading Signals (GitHub):**');
    expect(md).toContain('- GitHub signal 1');
    expect(md).toContain('**Coincident Signals (Onchain/DeFi):**');
    expect(md).toContain('**Confirming Signals (Market):**');
    expect(md).toContain('**Related repos:**');
    expect(md).toContain('**Related tokens:**');
  });

  it('should render build idea with difficulty, timeframe, techStack, whyNow', async () => {
    await writeMarkdownReport(makeReport(), '2026-02-12');

    const md = mockWriteFile.mock.calls[0][1] as string;
    expect(md).toContain('### 1. Test Idea');
    expect(md).toContain('**Difficulty:** intermediate');
    expect(md).toContain('**Timeframe:** 2-4 weeks');
    expect(md).toContain('**Tech stack:** TypeScript, Anchor');
    expect(md).toContain('**Why now:** The timing is right');
  });

  it('should contain summary table with correct metrics', async () => {
    await writeMarkdownReport(makeReport(), '2026-02-12');

    const md = mockWriteFile.mock.calls[0][1] as string;
    expect(md).toContain('## Summary');
    expect(md).toContain('| Repos analyzed | 50 |');
    expect(md).toContain('| Protocols analyzed | 20 |');
    expect(md).toContain('| Anomalies detected | 5 |');
  });

  it('should contain narratives section', async () => {
    await writeMarkdownReport(makeReport(), '2026-02-12');

    const md = mockWriteFile.mock.calls[0][1] as string;
    expect(md).toContain('## Narratives');
    expect(md).toContain('Test Narrative');
  });

  it('should contain data sources table', async () => {
    await writeMarkdownReport(makeReport(), '2026-02-12');

    const md = mockWriteFile.mock.calls[0][1] as string;
    expect(md).toContain('## Data Sources');
    expect(md).toContain('| GitHub | LEADING | 100 |');
    expect(md).toContain('| DeFi Llama | COINCIDENT | 50 |');
  });

  it('should return the file path', async () => {
    const result = await writeMarkdownReport(makeReport(), '2026-02-12');
    expect(result).toBe('/tmp/solis-reports/2026-02-12.md');
  });
});
