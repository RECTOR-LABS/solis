import 'dotenv/config';
import { join } from 'node:path';
import { logger } from './logger.js';
import { CacheStore } from './cache/index.js';
import { recordStars, loadStarHistory, enrichWithStarHistory } from './cache/star-history.js';
import { collectGitHub } from './tools/github.js';
import { collectDefiLlama } from './tools/defillama.js';
import { collectCoinGecko } from './tools/coingecko.js';
import { collectHelius } from './tools/helius.js';
import { getAllRepoNames } from './repos/curated.js';
import { discoverRepos } from './repos/discovery.js';
import { scoreSignals, type ScoredSignals } from './analysis/scoring.js';
import { clusterNarratives } from './analysis/clustering.js';
import { generateBuildIdeas } from './analysis/ideas.js';
import { env } from './config.js';
import { loadPreviousReport } from './utils/reports.js';
import { applyDeltas } from './utils/deltas.js';
import {
  emptyGitHubSignals,
  emptyCoincidentSignals,
  emptyOnchainSignals,
  emptyConfirmingSignals,
  emptySocialSignals,
  emptyXSignals,
} from './utils/empty-signals.js';
import { computeReportDiff } from './utils/history.js';
import type {
  FortnightlyReport,
  CoincidentSignals,
  DataSourceStatus,
  GitHubSignals,
  ConfirmingSignals,
  SocialSignals,
  XSignals,
  OnchainSignal,
  ReportDiff,
} from '@solis/shared';

interface SourceResult {
  status: DataSourceStatus;
  error?: string;
}

export async function runPipeline(): Promise<void> {
  const startTime = Date.now();
  const periodDays = env.COLLECTION_PERIOD_DAYS;
  const periodWeeks = Math.round(periodDays / 7);

  logger.info({
    collectionPeriodDays: periodDays,
    anomalyThreshold: env.ANOMALY_THRESHOLD,
    llmModel: env.OPENROUTER_MODEL,
    llmTopRepos: env.LLM_TOP_REPOS,
    llmTopPrograms: env.LLM_TOP_PROGRAMS,
    llmTopTokens: env.LLM_TOP_TOKENS,
    coingeckoMaxPages: env.COINGECKO_MAX_PAGES,
    defillamaMinTvl: env.DEFILLAMA_MIN_TVL,
  }, 'SOLIS pipeline starting');

  const cache = env.CACHE_ENABLED
    ? new CacheStore(join(env.REPORTS_DIR, '.cache'))
    : undefined;

  try {
    // === Phase 0: Repo discovery (optional) ===
    let repos: string[];
    if (env.ENABLE_REPO_DISCOVERY) {
      try {
        logger.info({ phase: 'discovery' }, 'Phase 0: Discovering repos...');
        const { allRepos, discoveredCount } = await discoverRepos(env.DISCOVERY_MIN_STARS);
        repos = allRepos.map(r => r.repo);
        logger.info({ discoveredCount, totalRepos: repos.length }, 'Discovery merged with curated list');
      } catch (err) {
        logger.warn({ error: err instanceof Error ? err.message : err }, 'Discovery failed — falling back to curated list');
        repos = getAllRepoNames();
      }
    } else {
      repos = getAllRepoNames();
    }

    // === Phase 1: Collect signals from all layers ===
    logger.info({ phase: 'collect', socialEnabled: env.ENABLE_SOCIAL_SIGNALS }, 'Phase 1: Collecting signals...');
    logger.info({ repoCount: repos.length }, 'Tracking repos');

    // Build collector promises — Layer 0 is conditional
    const collectors: Promise<unknown>[] = [
      collectGitHub(repos, periodWeeks, cache),
      collectDefiLlama(periodDays, cache),
      collectHelius(periodDays, undefined, cache),
      collectCoinGecko(env.COINGECKO_MAX_PAGES, cache),
    ];

    let socialCollectorIndex = -1;
    if (env.ENABLE_SOCIAL_SIGNALS) {
      const { collectLunarCrush } = await import('./tools/lunarcrush.js');
      socialCollectorIndex = collectors.length;
      collectors.push(collectLunarCrush(periodDays));
    }

    let xCollectorIndex = -1;
    if (env.ENABLE_X_SIGNALS) {
      const { collectX } = await import('./tools/twitter.js');
      xCollectorIndex = collectors.length;
      collectors.push(collectX(periodDays));
    }

    const results = await Promise.allSettled(collectors);
    const [githubResult, defiLlamaResult, heliusResult, coingeckoResult] = results as PromiseSettledResult<any>[];

    // Track source results for report metadata
    const sourceResults: Record<string, SourceResult> = {};

    // Unwrap results with empty fallbacks
    let leading: GitHubSignals;
    if (githubResult.status === 'fulfilled') {
      leading = githubResult.value;
      sourceResults['GitHub API'] = { status: 'success' };
    } else {
      logger.error({ error: githubResult.reason }, 'GitHub collection failed — using empty signals');
      leading = emptyGitHubSignals();
      sourceResults['GitHub API'] = { status: 'failed', error: String(githubResult.reason) };
    }

    let defiLlamaData: Omit<CoincidentSignals, 'onchain'>;
    if (defiLlamaResult.status === 'fulfilled') {
      defiLlamaData = defiLlamaResult.value;
      sourceResults['DeFi Llama'] = { status: 'success' };
    } else {
      logger.error({ error: defiLlamaResult.reason }, 'DeFi Llama collection failed — using empty signals');
      defiLlamaData = emptyCoincidentSignals();
      sourceResults['DeFi Llama'] = { status: 'failed', error: String(defiLlamaResult.reason) };
    }

    let onchainSignals: OnchainSignal[];
    if (heliusResult.status === 'fulfilled') {
      onchainSignals = heliusResult.value;
      sourceResults['Helius'] = { status: 'success' };
    } else {
      logger.error({ error: heliusResult.reason }, 'Helius collection failed — using empty signals');
      onchainSignals = emptyOnchainSignals();
      sourceResults['Helius'] = { status: 'failed', error: String(heliusResult.reason) };
    }

    let confirming: ConfirmingSignals;
    if (coingeckoResult.status === 'fulfilled') {
      confirming = coingeckoResult.value;
      sourceResults['CoinGecko'] = { status: 'success' };
    } else {
      logger.error({ error: coingeckoResult.reason }, 'CoinGecko collection failed — using empty signals');
      confirming = emptyConfirmingSignals();
      sourceResults['CoinGecko'] = { status: 'failed', error: String(coingeckoResult.reason) };
    }

    // Unwrap social signals (Layer 0) — conditional
    let social: SocialSignals | undefined;
    if (socialCollectorIndex >= 0) {
      const socialResult = results[socialCollectorIndex];
      if (socialResult.status === 'fulfilled') {
        social = socialResult.value as SocialSignals;
        sourceResults['LunarCrush'] = { status: 'success' };
      } else {
        logger.error({ error: (socialResult as PromiseRejectedResult).reason }, 'LunarCrush collection failed — using empty signals');
        social = emptySocialSignals();
        sourceResults['LunarCrush'] = { status: 'failed', error: String((socialResult as PromiseRejectedResult).reason) };
      }
    }

    // Unwrap X signals (Layer 0) — conditional
    let x: XSignals | undefined;
    if (xCollectorIndex >= 0) {
      const xResult = results[xCollectorIndex];
      if (xResult.status === 'fulfilled') {
        x = xResult.value as XSignals;
        sourceResults['X/Twitter'] = { status: 'success' };
      } else {
        logger.error({ error: (xResult as PromiseRejectedResult).reason }, 'X/Twitter collection failed — using empty signals');
        x = emptyXSignals();
        sourceResults['X/Twitter'] = { status: 'failed', error: String((xResult as PromiseRejectedResult).reason) };
      }
    }

    const coincident: CoincidentSignals = {
      ...defiLlamaData,
      onchain: onchainSignals,
    };

    // === Phase 1.5: Star history tracking ===
    const todayDate = new Date().toISOString().split('T')[0];
    const starHistoryPath = join(env.REPORTS_DIR, '.cache', 'github', 'star-history.json');
    try {
      await recordStars(
        leading.repos.map(r => ({ repo: r.repo, stars: r.stars })),
        todayDate,
        starHistoryPath,
      );
      const starHistory = await loadStarHistory(starHistoryPath);
      enrichWithStarHistory(leading.repos, starHistory, todayDate);
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : err }, 'Star history tracking failed — continuing without');
    }

    // === Phase 2: Calculate deltas from previous report ===
    const previousReport = await loadPreviousReport(todayDate);
    applyDeltas(leading, coincident, confirming, previousReport, social, x);

    // === Phase 2: Score signals with z-scores ===
    logger.info({ phase: 'score' }, 'Phase 2: Scoring signals...');
    let scored: ScoredSignals;
    try {
      scored = scoreSignals(leading, coincident, confirming, env.ANOMALY_THRESHOLD, social, x);
      logger.info({ summary: scored.summary }, 'Scoring complete');
    } catch (err) {
      logger.error({ error: err instanceof Error ? err.message : err }, 'Scoring failed — proceeding with unscored signals');
      scored = {
        leading,
        coincident,
        confirming,
        summary: { socialAnomalies: 0, xAnomalies: 0, leadingAnomalies: 0, coincidentAnomalies: 0, confirmingAnomalies: 0, totalAnomalies: 0 },
      };
    }

    // === Phase 3: Cluster narratives via LLM ===
    logger.info({ phase: 'cluster' }, 'Phase 3: Clustering narratives...');
    const { narratives, tokensUsed: clusterTokens, costUsd: clusterCost } = await clusterNarratives({
      leading: scored.leading,
      coincident: scored.coincident,
      confirming: scored.confirming,
      social: scored.social,
      x: scored.x,
      previousNarratives: previousReport?.narratives,
    });

    // === Phase 4: Generate build ideas ===
    logger.info({ phase: 'ideas' }, 'Phase 4: Generating build ideas...');
    const { ideas, tokensUsed: ideaTokens, costUsd: ideaCost } = await generateBuildIdeas(narratives);

    // === Phase 4.5: Compute report diff ===
    let diff: ReportDiff | undefined;
    if (previousReport) {
      diff = computeReportDiff(narratives, previousReport.narratives);
      logger.info({
        newNarratives: diff.newNarratives.length,
        removed: diff.removedNarratives.length,
        transitions: diff.stageTransitions.length,
      }, 'Report diff computed');
    }

    // === Phase 5: Assemble and write report ===
    logger.info({ phase: 'output' }, 'Phase 5: Assembling report...');

    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - periodDays);

    const report: FortnightlyReport = {
      version: '1.0',
      generatedAt: now.toISOString(),
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString(),
      },
      sources: [
        ...(social ? [{ name: 'LunarCrush', layer: 'SOCIAL' as const, fetchedAt: now.toISOString(), dataPoints: social.coins.length, ...sourceResults['LunarCrush'] }] : []),
        ...(x ? [{ name: 'X/Twitter', layer: 'SOCIAL' as const, fetchedAt: now.toISOString(), dataPoints: x.totalTweetsAnalyzed, ...sourceResults['X/Twitter'] }] : []),
        { name: 'GitHub API', layer: 'LEADING', fetchedAt: now.toISOString(), dataPoints: leading.repos.length, ...sourceResults['GitHub API'] },
        { name: 'DeFi Llama', layer: 'COINCIDENT', fetchedAt: now.toISOString(), dataPoints: coincident.tvl.protocols.length, ...sourceResults['DeFi Llama'] },
        { name: 'Helius', layer: 'COINCIDENT', fetchedAt: now.toISOString(), dataPoints: coincident.onchain.length, ...sourceResults['Helius'] },
        { name: 'CoinGecko', layer: 'CONFIRMING', fetchedAt: now.toISOString(), dataPoints: confirming.tokens.length, ...sourceResults['CoinGecko'] },
      ],
      signals: {
        leading: scored.leading,
        coincident: scored.coincident,
        confirming: scored.confirming,
        ...(scored.social ? { social: scored.social } : {}),
        ...(scored.x ? { x: scored.x } : {}),
      },
      narratives,
      buildIdeas: ideas,
      diff,
      meta: {
        totalReposAnalyzed: leading.repos.length,
        totalProtocolsAnalyzed: coincident.tvl.protocols.length + coincident.dexVolumes.protocols.length,
        totalTokensAnalyzed: confirming.tokens.length,
        anomaliesDetected: scored.summary.totalAnomalies,
        narrativesIdentified: narratives.length,
        buildIdeasGenerated: ideas.length,
        llmModel: env.OPENROUTER_MODEL,
        llmTokensUsed: clusterTokens + ideaTokens,
        llmCostUsd: clusterCost + ideaCost,
        pipelineDurationMs: Date.now() - startTime,
      },
    };

    const { writeJsonReport } = await import('./output/json.js');
    const { writeMarkdownReport } = await import('./output/markdown.js');
    const { sendReportAlerts } = await import('./output/alerts.js');

    const date = now.toISOString().split('T')[0];
    await writeJsonReport(report, date);
    await writeMarkdownReport(report, date);

    // === Phase 6: Send alerts ===
    await sendReportAlerts(report);

    const duration = Date.now() - startTime;
    const failedSources = Object.entries(sourceResults)
      .filter(([, r]) => r.status === 'failed')
      .map(([name]) => name);

    logger.info({
      durationMs: duration,
      narratives: narratives.length,
      buildIdeas: ideas.length,
      anomalies: scored.summary.totalAnomalies,
      llmCostUsd: (clusterCost + ideaCost).toFixed(4),
      ...(failedSources.length > 0 ? { failedSources } : {}),
    }, 'SOLIS pipeline complete');
  } catch (error) {
    logger.error({ err: error instanceof Error ? { message: error.message, stack: error.stack, cause: error.cause } : error }, 'Pipeline failed');
    throw error;
  }
}

async function main() {
  try {
    await runPipeline();
  } catch (error) {
    const { sendFailureAlert } = await import('./output/alerts.js');
    await sendFailureAlert(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Direct execution guard
const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'));
if (isDirectRun) main();
