import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config.js', () => ({
  env: {
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_MODEL: 'test-model',
    LOG_LEVEL: 'error',
    isDevelopment: false,
    COLLECTION_PERIOD_DAYS: 14,
    ANOMALY_THRESHOLD: 2.0,
    LLM_TOP_REPOS: 30,
    LLM_TOP_PROGRAMS: 15,
    LLM_TOP_TOKENS: 20,
    COINGECKO_MAX_PAGES: 2,
    DEFILLAMA_MIN_TVL: 100000,
    CACHE_ENABLED: false,
    REPORTS_DIR: '/tmp/solis-test-reports',
    ENABLE_REPO_DISCOVERY: false,
    ENABLE_SOCIAL_SIGNALS: false,
    ENABLE_X_SIGNALS: false,
  },
}));

vi.mock('../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

// Mock all collectors
const mockCollectGitHub = vi.fn();
const mockCollectDefiLlama = vi.fn();
const mockCollectCoinGecko = vi.fn();
const mockCollectHelius = vi.fn();

vi.mock('../src/tools/github.js', () => ({
  collectGitHub: (...args: unknown[]) => mockCollectGitHub(...args),
}));
vi.mock('../src/tools/defillama.js', () => ({
  collectDefiLlama: (...args: unknown[]) => mockCollectDefiLlama(...args),
}));
vi.mock('../src/tools/coingecko.js', () => ({
  collectCoinGecko: (...args: unknown[]) => mockCollectCoinGecko(...args),
}));
vi.mock('../src/tools/helius.js', () => ({
  collectHelius: (...args: unknown[]) => mockCollectHelius(...args),
}));

vi.mock('../src/repos/curated.js', () => ({
  getAllRepoNames: () => ['solana-labs/solana', 'coral-xyz/anchor'],
}));

vi.mock('../src/cache/star-history.js', () => ({
  recordStars: vi.fn(),
  loadStarHistory: vi.fn().mockResolvedValue({}),
  enrichWithStarHistory: vi.fn(),
}));

vi.mock('../src/utils/reports.js', () => ({
  loadPreviousReport: vi.fn().mockResolvedValue(null),
}));

vi.mock('../src/utils/deltas.js', () => ({
  applyDeltas: vi.fn(),
}));

const mockClusterNarratives = vi.fn();
vi.mock('../src/analysis/clustering.js', () => ({
  clusterNarratives: (...args: unknown[]) => mockClusterNarratives(...args),
}));

const mockGenerateBuildIdeas = vi.fn();
vi.mock('../src/analysis/ideas.js', () => ({
  generateBuildIdeas: (...args: unknown[]) => mockGenerateBuildIdeas(...args),
}));

const mockWriteJsonReport = vi.fn();
const mockWriteMarkdownReport = vi.fn();
const mockSendReportAlerts = vi.fn();

vi.mock('../src/output/json.js', () => ({
  writeJsonReport: (...args: unknown[]) => mockWriteJsonReport(...args),
}));
vi.mock('../src/output/markdown.js', () => ({
  writeMarkdownReport: (...args: unknown[]) => mockWriteMarkdownReport(...args),
}));
vi.mock('../src/output/alerts.js', () => ({
  sendReportAlerts: (...args: unknown[]) => mockSendReportAlerts(...args),
  sendFailureAlert: vi.fn(),
}));

vi.mock('../src/utils/history.js', () => ({
  computeReportDiff: vi.fn().mockReturnValue({
    newNarratives: [],
    removedNarratives: [],
    stageTransitions: [],
    confidenceChanges: [],
  }),
}));

import { runPipeline } from '../src/index.js';

const emptyGitHub = {
  period: { start: '', end: '' },
  repos: [],
  anomalies: [],
  newRepoClusters: [],
};

const emptyDefiLlama = {
  period: { start: '', end: '' },
  tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
  dexVolumes: { total: 0, protocols: [] },
  stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
};

const emptyConfirming = {
  period: { start: '', end: '' },
  tokens: [],
  trending: [],
  categoryPerformance: [],
};

function setupMocks() {
  mockCollectGitHub.mockResolvedValue(emptyGitHub);
  mockCollectDefiLlama.mockResolvedValue(emptyDefiLlama);
  mockCollectHelius.mockResolvedValue([]);
  mockCollectCoinGecko.mockResolvedValue(emptyConfirming);

  mockClusterNarratives.mockResolvedValue({
    narratives: [],
    tokensUsed: 100,
    costUsd: 0.001,
  });

  mockGenerateBuildIdeas.mockResolvedValue({
    ideas: [],
    tokensUsed: 50,
    costUsd: 0.0005,
  });

  mockWriteJsonReport.mockResolvedValue(undefined);
  mockWriteMarkdownReport.mockResolvedValue(undefined);
  mockSendReportAlerts.mockResolvedValue(undefined);
}

describe('runPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('completes pipeline and writes output', async () => {
    await runPipeline();

    expect(mockCollectGitHub).toHaveBeenCalled();
    expect(mockCollectDefiLlama).toHaveBeenCalled();
    expect(mockCollectHelius).toHaveBeenCalled();
    expect(mockCollectCoinGecko).toHaveBeenCalled();
    expect(mockClusterNarratives).toHaveBeenCalled();
    expect(mockGenerateBuildIdeas).toHaveBeenCalled();
    expect(mockWriteJsonReport).toHaveBeenCalled();
    expect(mockWriteMarkdownReport).toHaveBeenCalled();
  });

  it('sends alerts after output phase', async () => {
    await runPipeline();
    expect(mockSendReportAlerts).toHaveBeenCalled();
  });

  it('completes when a collector fails (graceful degradation)', async () => {
    mockCollectGitHub.mockRejectedValue(new Error('GitHub API down'));

    await runPipeline();

    // Pipeline still completes with empty fallback for GitHub
    expect(mockClusterNarratives).toHaveBeenCalled();
    expect(mockWriteJsonReport).toHaveBeenCalled();
  });

  it('completes when multiple collectors fail', async () => {
    mockCollectGitHub.mockRejectedValue(new Error('GitHub down'));
    mockCollectDefiLlama.mockRejectedValue(new Error('DeFi Llama down'));
    mockCollectHelius.mockRejectedValue(new Error('Helius down'));

    await runPipeline();

    expect(mockClusterNarratives).toHaveBeenCalled();
    expect(mockWriteJsonReport).toHaveBeenCalled();
  });

  it('throws when LLM clustering fails fatally', async () => {
    mockClusterNarratives.mockRejectedValue(new Error('LLM catastrophic failure'));

    await expect(runPipeline()).rejects.toThrow('LLM catastrophic failure');
  });
});
