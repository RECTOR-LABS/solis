import 'dotenv/config';
import { logger } from './logger.js';
import { collectGitHub } from './tools/github.js';
import { collectDefiLlama } from './tools/defillama.js';
import { collectCoinGecko } from './tools/coingecko.js';
import { collectHelius } from './tools/helius.js';
import { getAllRepoNames } from './repos/curated.js';
import { scoreSignals } from './analysis/scoring.js';
import { clusterNarratives } from './analysis/clustering.js';
import { generateBuildIdeas } from './analysis/ideas.js';
import { env } from './config.js';
import type { FortnightlyReport, CoincidentSignals } from '@solis/shared';

const startTime = Date.now();

async function main() {
  logger.info('SOLIS pipeline starting');

  try {
    // === Phase 1: Collect signals from all 3 layers ===
    logger.info({ phase: 'collect' }, 'Phase 1: Collecting signals...');

    const repos = getAllRepoNames();
    logger.info({ repoCount: repos.length }, 'Tracking repos');

    const [leading, defiLlamaData, onchainSignals, confirming] = await Promise.all([
      collectGitHub(repos, 2),
      collectDefiLlama(14),
      collectHelius(14),
      collectCoinGecko(2),
    ]);

    const coincident: CoincidentSignals = {
      ...defiLlamaData,
      onchain: onchainSignals,
    };

    // === Phase 2: Score signals with z-scores ===
    logger.info({ phase: 'score' }, 'Phase 2: Scoring signals...');
    const scored = scoreSignals(leading, coincident, confirming, env.ANOMALY_THRESHOLD);
    logger.info({ summary: scored.summary }, 'Scoring complete');

    // === Phase 3: Cluster narratives via LLM ===
    logger.info({ phase: 'cluster' }, 'Phase 3: Clustering narratives...');
    const { narratives, tokensUsed: clusterTokens, costUsd: clusterCost } = await clusterNarratives({
      leading: scored.leading,
      coincident: scored.coincident,
      confirming: scored.confirming,
    });

    // === Phase 4: Generate build ideas ===
    logger.info({ phase: 'ideas' }, 'Phase 4: Generating build ideas...');
    const { ideas, tokensUsed: ideaTokens, costUsd: ideaCost } = await generateBuildIdeas(narratives);

    // === Phase 5: Assemble and write report ===
    logger.info({ phase: 'output' }, 'Phase 5: Assembling report...');

    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - 14);

    const report: FortnightlyReport = {
      version: '1.0',
      generatedAt: now.toISOString(),
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString(),
      },
      sources: [
        { name: 'GitHub API', layer: 'LEADING', fetchedAt: now.toISOString(), dataPoints: leading.repos.length },
        { name: 'DeFi Llama', layer: 'COINCIDENT', fetchedAt: now.toISOString(), dataPoints: coincident.tvl.protocols.length },
        { name: 'Helius', layer: 'COINCIDENT', fetchedAt: now.toISOString(), dataPoints: coincident.onchain.length },
        { name: 'CoinGecko', layer: 'CONFIRMING', fetchedAt: now.toISOString(), dataPoints: confirming.tokens.length },
      ],
      signals: {
        leading: scored.leading,
        coincident: scored.coincident,
        confirming: scored.confirming,
      },
      narratives,
      buildIdeas: ideas,
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

    const date = now.toISOString().split('T')[0];
    await writeJsonReport(report, date);
    await writeMarkdownReport(report, date);

    const duration = Date.now() - startTime;
    logger.info({
      durationMs: duration,
      narratives: narratives.length,
      buildIdeas: ideas.length,
      anomalies: scored.summary.totalAnomalies,
      llmCostUsd: (clusterCost + ideaCost).toFixed(4),
    }, 'SOLIS pipeline complete');
  } catch (error) {
    logger.error({ error }, 'Pipeline failed');
    process.exit(1);
  }
}

main();
