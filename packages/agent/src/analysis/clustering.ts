import { z } from 'zod';
import { analyzeWithLLM, parseLLMJson } from './openrouter.js';
import { withRetry } from '../utils/retry.js';
import { logger } from '../logger.js';
import { populateHistory } from '../utils/history.js';
import type {
  Narrative,
  SignalStage,
  MomentumDirection,
  GitHubSignals,
  CoincidentSignals,
  ConfirmingSignals,
} from '@solis/shared';

interface ClusteringInput {
  leading: GitHubSignals;
  coincident: CoincidentSignals;
  confirming: ConfirmingSignals;
  previousNarratives?: Narrative[];
}

const NarrativeSchema = z.object({
  name: z.string(),
  description: z.string(),
  stage: z.string(),
  momentum: z.string(),
  confidence: z.number(),
  leading_signals: z.array(z.string()).default([]),
  coincident_signals: z.array(z.string()).default([]),
  confirming_signals: z.array(z.string()).default([]),
  related_repos: z.array(z.string()).default([]),
  related_tokens: z.array(z.string()).default([]),
  related_protocols: z.array(z.string()).default([]),
});

const NarrativesResponseSchema = z.object({
  narratives: z.array(NarrativeSchema).default([]),
});

const SYSTEM_PROMPT = `You are SOLIS, a Solana ecosystem intelligence analyst. Your job is to identify emerging narratives by clustering signals across three layers:

1. LEADING (GitHub): Developer activity that precedes market movement by 2-4 weeks
2. COINCIDENT (DeFi Llama + Helius): Real-time capital and onchain activity
3. CONFIRMING (CoinGecko): Market price/volume validation

Signal Stage Classification:
- EARLY: Only Layer 1 signals fire (devs building, market hasn't noticed)
- EMERGING: Layer 1 + 2 align (builders + capital moving together)
- GROWING: All 3 layers align with increasing momentum
- MAINSTREAM: All 3 layers, high confidence (likely already priced in)

Momentum:
- accelerating: Signal strength increasing over the period
- stable: Signal strength consistent
- decelerating: Signal strength decreasing

Rules:
- Identify 3-10 distinct narratives from the data
- Each narrative must be backed by at least 2 concrete signals
- Confidence (0-100) reflects how strongly the data supports the narrative
- Be specific to Solana — not generic crypto narratives
- Focus on actionable insights builders can use
- Output valid JSON only`;

const USER_PROMPT_TEMPLATE = (data: string, previousContext: string) => `Analyze these Solana ecosystem signals and identify emerging narratives.

DATA:
${data}
${previousContext}
Respond with a JSON object containing a "narratives" array where each narrative has:
- name: string (concise, specific name like "Solana DePIN Expansion" not "DePIN")
- description: string (2-3 sentences explaining the narrative)
- stage: "EARLY" | "EMERGING" | "GROWING" | "MAINSTREAM"
- momentum: "accelerating" | "stable" | "decelerating"
- confidence: number (0-100)
- leading_signals: string[] (human-readable descriptions of GitHub signals)
- coincident_signals: string[] (TVL/volume/onchain signals)
- confirming_signals: string[] (price/market signals)
- related_repos: string[] (owner/name format)
- related_tokens: string[] (symbols)
- related_protocols: string[] (protocol names)`;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function validateStage(stage: string): SignalStage {
  const valid: SignalStage[] = ['EARLY', 'EMERGING', 'GROWING', 'MAINSTREAM'];
  return valid.includes(stage as SignalStage) ? (stage as SignalStage) : 'EMERGING';
}

function validateMomentum(momentum: string): MomentumDirection {
  const valid: MomentumDirection[] = ['accelerating', 'stable', 'decelerating'];
  return valid.includes(momentum as MomentumDirection) ? (momentum as MomentumDirection) : 'stable';
}

export async function clusterNarratives(
  signals: ClusteringInput,
): Promise<{ narratives: Narrative[]; tokensUsed: number; costUsd: number }> {
  const log = logger.child({ component: 'clustering' });

  // Prepare condensed signal data for the LLM
  const condensed = {
    github: {
      anomalies: signals.leading.anomalies.map(a => ({
        repo: a.repo,
        starsDelta: a.starsDelta,
        starsZScore: a.starsZScore,
        commitsDelta: a.commitsDelta,
        commitsZScore: a.commitsZScore,
        topics: a.topics,
        newRepo: a.newRepo,
      })),
      newRepoClusters: signals.leading.newRepoClusters,
      topByCommits: signals.leading.repos
        .sort((a, b) => b.commitsDelta - a.commitsDelta)
        .slice(0, 30)
        .map(r => ({ repo: r.repo, commitsDelta: r.commitsDelta, topics: r.topics })),
    },
    defi: {
      tvlTotal: signals.coincident.tvl.total,
      tvlDelta: signals.coincident.tvl.totalDelta,
      tvlAnomalies: signals.coincident.tvl.anomalies.map(a => ({
        protocol: a.protocol,
        category: a.category,
        tvl: a.tvl,
        tvlDeltaPercent: a.tvlDeltaPercent,
        tvlZScore: a.tvlZScore,
      })),
      topDexVolume: signals.coincident.dexVolumes.protocols.slice(0, 10),
      stablecoinFlows: signals.coincident.stablecoinFlows,
    },
    onchain: signals.coincident.onchain
      .filter(s => s.txCount > 0)
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 15)
      .map(s => ({ program: s.programName, txCount: s.txCount, txZScore: s.txZScore })),
    market: {
      topPerformers: signals.confirming.tokens
        .sort((a, b) => b.priceDelta14d - a.priceDelta14d)
        .slice(0, 20)
        .map(t => ({ symbol: t.symbol, priceDelta14d: t.priceDelta14d, volume24h: t.volume24h })),
      trending: signals.confirming.trending.map(t => ({ symbol: t.symbol, name: t.name })),
      categories: signals.confirming.categoryPerformance,
    },
  };

  const dataStr = JSON.stringify(condensed, null, 2);

  // Build previous narrative context for LLM
  let previousContext = '';
  if (signals.previousNarratives && signals.previousNarratives.length > 0) {
    const prevSummary = signals.previousNarratives.map(
      n => `- "${n.name}" (stage: ${n.stage}, momentum: ${n.momentum}, confidence: ${n.confidence}%)`,
    ).join('\n');
    previousContext = `\nPREVIOUS REPORT NARRATIVES (use same names where the narrative continues, so we can track stage transitions):\n${prevSummary}\n`;
  }

  log.info({ dataLength: dataStr.length, hasPrevious: !!signals.previousNarratives?.length }, 'Sending signals to LLM for clustering');

  try {
    const response = await withRetry(
      () => analyzeWithLLM(SYSTEM_PROMPT, USER_PROMPT_TEMPLATE(dataStr, previousContext), true),
      'clustering-llm',
      { attempts: 2, baseDelayMs: 2000 },
    );

    const raw = parseLLMJson<unknown>(response.content);
    const parsed = NarrativesResponseSchema.parse(raw);

    const narratives: Narrative[] = parsed.narratives.map((n, i) => ({
      id: `n-${i + 1}`,
      name: n.name,
      slug: slugify(n.name),
      description: n.description,
      stage: validateStage(n.stage),
      momentum: validateMomentum(n.momentum),
      confidence: Math.max(0, Math.min(100, n.confidence)),
      signals: {
        leading: n.leading_signals,
        coincident: n.coincident_signals,
        confirming: n.confirming_signals,
      },
      relatedRepos: n.related_repos,
      relatedTokens: n.related_tokens,
      relatedProtocols: n.related_protocols,
    }));

    // Populate history fields by matching against previous narratives
    if (signals.previousNarratives && signals.previousNarratives.length > 0) {
      populateHistory(narratives, signals.previousNarratives, new Date().toISOString());
      const transitions = narratives.filter(n => n.previousStage && n.stage !== n.previousStage);
      const newCount = narratives.filter(n => n.isNew).length;
      log.info({ transitions: transitions.length, newNarratives: newCount }, 'History matching complete');
    }

    log.info({
      narrativesFound: narratives.length,
      tokensUsed: response.tokensUsed.total,
      costUsd: response.costUsd.toFixed(4),
    }, 'Narrative clustering complete');

    return {
      narratives,
      tokensUsed: response.tokensUsed.total,
      costUsd: response.costUsd,
    };
  } catch (err) {
    log.error({ error: err instanceof Error ? err.message : err }, 'Narrative clustering failed — returning empty narratives');
    return { narratives: [], tokensUsed: 0, costUsd: 0 };
  }
}
