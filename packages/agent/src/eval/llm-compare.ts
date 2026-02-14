import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { env } from '../config.js';
import { logger } from '../logger.js';
import { analyzeWithLLM, parseLLMJson } from '../analysis/openrouter.js';
import { matchNarratives } from '../utils/history.js';
import type { FortnightlyReport, Narrative, SignalStage, MomentumDirection } from '@solis/shared';

export interface EvalResult {
  model: string;
  narratives: Narrative[];
  tokensUsed: number;
  costUsd: number;
  latencyMs: number;
}

export interface LLMComparison {
  date: string;
  models: [EvalResult, EvalResult];
  analysis: {
    narrativeOverlap: number;
    stageAgreement: number;
    avgConfidenceDelta: number;
    uniqueToA: string[];
    uniqueToB: string[];
  };
}

const SYSTEM_PROMPT = `You are SOLIS, a Solana ecosystem intelligence analyst. Your job is to identify emerging narratives by clustering signals across up to four layers:

0. SOCIAL (LunarCrush + X/Twitter): Social sentiment, community engagement
1. LEADING (GitHub): Developer activity that precedes market movement
2. COINCIDENT (DeFi Llama + Helius): Real-time capital and onchain activity
3. CONFIRMING (CoinGecko): Market price/volume validation

Signal Stage Classification:
- EARLY: Only Layer 0-1 signals fire
- EMERGING: Layer 1 + 2 align
- GROWING: All layers align with increasing momentum
- MAINSTREAM: All layers, high confidence

Rules:
- Identify 3-10 distinct narratives from the data
- Each narrative must be backed by at least 2 concrete signals
- Confidence (0-100) reflects how strongly the data supports the narrative
- Be specific to Solana
- Output valid JSON only`;

const USER_PROMPT = (data: string) => `Analyze these Solana ecosystem signals and identify emerging narratives.

DATA:
${data}

Respond with a JSON object containing a "narratives" array where each narrative has:
- name: string
- description: string (2-3 sentences)
- stage: "EARLY" | "EMERGING" | "GROWING" | "MAINSTREAM"
- momentum: "accelerating" | "stable" | "decelerating"
- confidence: number (0-100)
- leading_signals: string[]
- coincident_signals: string[]
- confirming_signals: string[]
- related_repos: string[]
- related_tokens: string[]
- related_protocols: string[]`;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function validateStage(stage: string): SignalStage {
  const valid: SignalStage[] = ['EARLY', 'EMERGING', 'GROWING', 'MAINSTREAM'];
  return valid.includes(stage as SignalStage) ? (stage as SignalStage) : 'EMERGING';
}

function validateMomentum(momentum: string): MomentumDirection {
  const valid: MomentumDirection[] = ['accelerating', 'stable', 'decelerating'];
  return valid.includes(momentum as MomentumDirection) ? (momentum as MomentumDirection) : 'stable';
}

function parseNarratives(content: string): Narrative[] {
  const raw = parseLLMJson<{ narratives: Array<Record<string, any>> }>(content);
  return (raw.narratives ?? []).map((n, i) => ({
    id: `n-${i + 1}`,
    name: n.name ?? '',
    slug: slugify(n.name ?? ''),
    description: n.description ?? '',
    stage: validateStage(n.stage ?? ''),
    momentum: validateMomentum(n.momentum ?? ''),
    confidence: Math.max(0, Math.min(100, n.confidence ?? 50)),
    signals: {
      leading: n.leading_signals ?? [],
      coincident: n.coincident_signals ?? [],
      confirming: n.confirming_signals ?? [],
      social: n.social_signals ?? [],
    },
    relatedRepos: n.related_repos ?? [],
    relatedTokens: n.related_tokens ?? [],
    relatedProtocols: n.related_protocols ?? [],
  }));
}

export function computeComparison(a: EvalResult, b: EvalResult): LLMComparison['analysis'] {
  const matches = matchNarratives(a.narratives, b.narratives);

  const matchedB = new Set(matches.filter(m => m.previous).map(m => m.previous!.slug));
  const matchedA = new Set(matches.filter(m => m.previous).map(m => m.current.slug));

  const uniqueToA = a.narratives.filter(n => !matchedA.has(n.slug)).map(n => n.name);
  const uniqueToB = b.narratives.filter(n => !matchedB.has(n.slug)).map(n => n.name);

  // Jaccard overlap of narrative names
  const allSlugs = new Set([...a.narratives.map(n => n.slug), ...b.narratives.map(n => n.slug)]);
  const overlapCount = matches.filter(m => m.previous).length;
  const narrativeOverlap = allSlugs.size > 0 ? overlapCount / allSlugs.size : 0;

  // Stage agreement (among matched pairs)
  const matchedPairs = matches.filter(m => m.previous);
  const stageMatches = matchedPairs.filter(m => m.current.stage === m.previous!.stage).length;
  const stageAgreement = matchedPairs.length > 0 ? stageMatches / matchedPairs.length : 0;

  // Avg confidence delta (among matched pairs)
  const confidenceDeltas = matchedPairs.map(m =>
    Math.abs(m.current.confidence - m.previous!.confidence),
  );
  const avgConfidenceDelta = confidenceDeltas.length > 0
    ? confidenceDeltas.reduce((s, d) => s + d, 0) / confidenceDeltas.length
    : 0;

  return {
    narrativeOverlap,
    stageAgreement,
    avgConfidenceDelta,
    uniqueToA,
    uniqueToB,
  };
}

async function runEval(date: string, modelA: string, modelB: string): Promise<LLMComparison> {
  const reportPath = join(env.REPORTS_DIR, `${date}.json`);
  const raw = await readFile(reportPath, 'utf-8');
  const report = JSON.parse(raw) as FortnightlyReport;

  // Condense signals (same as clustering.ts)
  const condensed = {
    github: {
      anomalies: report.signals.leading.anomalies.slice(0, 10),
      topByCommits: report.signals.leading.repos
        .sort((a, b) => b.commitsDelta - a.commitsDelta)
        .slice(0, env.LLM_TOP_REPOS)
        .map(r => ({ repo: r.repo, commitsDelta: r.commitsDelta, topics: r.topics })),
    },
    defi: {
      tvlTotal: report.signals.coincident.tvl.total,
      tvlDelta: report.signals.coincident.tvl.totalDelta,
      tvlAnomalies: report.signals.coincident.tvl.anomalies.slice(0, 10),
      topDexVolume: report.signals.coincident.dexVolumes.protocols.slice(0, 10),
      stablecoinFlows: report.signals.coincident.stablecoinFlows,
    },
    onchain: report.signals.coincident.onchain
      .filter(s => s.txCount > 0)
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, env.LLM_TOP_PROGRAMS),
    market: {
      topPerformers: report.signals.confirming.tokens
        .sort((a, b) => b.priceDelta14d - a.priceDelta14d)
        .slice(0, env.LLM_TOP_TOKENS)
        .map(t => ({ symbol: t.symbol, priceDelta14d: t.priceDelta14d, volume24h: t.volume24h })),
      trending: report.signals.confirming.trending.map(t => ({ symbol: t.symbol, name: t.name })),
    },
  };

  const dataStr = JSON.stringify(condensed, null, 2);
  const log = logger.child({ component: 'eval' });

  // Run model A
  log.info({ model: modelA }, 'Running model A...');
  const startA = Date.now();
  const responseA = await analyzeWithLLM(SYSTEM_PROMPT, USER_PROMPT(dataStr), true, modelA);
  const latencyA = Date.now() - startA;
  const narrativesA = parseNarratives(responseA.content);

  // Run model B
  log.info({ model: modelB }, 'Running model B...');
  const startB = Date.now();
  const responseB = await analyzeWithLLM(SYSTEM_PROMPT, USER_PROMPT(dataStr), true, modelB);
  const latencyB = Date.now() - startB;
  const narrativesB = parseNarratives(responseB.content);

  const resultA: EvalResult = {
    model: modelA,
    narratives: narrativesA,
    tokensUsed: responseA.tokensUsed.total,
    costUsd: responseA.costUsd,
    latencyMs: latencyA,
  };

  const resultB: EvalResult = {
    model: modelB,
    narratives: narrativesB,
    tokensUsed: responseB.tokensUsed.total,
    costUsd: responseB.costUsd,
    latencyMs: latencyB,
  };

  const analysis = computeComparison(resultA, resultB);

  return {
    date,
    models: [resultA, resultB],
    analysis,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      date: { type: 'string' },
      models: { type: 'string' },
    },
    strict: false,
    allowPositionals: true,
  });

  const date = values.date as string | undefined;
  if (!date) {
    console.error('Usage: pnpm eval:llm -- --date YYYY-MM-DD --models modelA,modelB');
    process.exit(1);
  }

  const modelsStr = (values.models as string | undefined) ?? `${env.OPENROUTER_MODEL},z-ai/glm-4.7`;
  const [modelA, modelB] = modelsStr.split(',').map((s: string) => s.trim());
  if (!modelA || !modelB) {
    console.error('Provide two comma-separated model IDs via --models');
    process.exit(1);
  }

  console.log(`\nEvaluating ${modelA} vs ${modelB} on report ${date}\n`);

  const result = await runEval(date, modelA, modelB);

  // Write output
  const evalDir = join(env.REPORTS_DIR, 'eval');
  await mkdir(evalDir, { recursive: true });
  const outPath = join(evalDir, `${date}-comparison.json`);
  await writeFile(outPath, JSON.stringify(result, null, 2), 'utf-8');

  // Console summary
  const a = result.analysis;
  console.log('=== Comparison Results ===');
  console.log(`Narrative overlap (Jaccard): ${(a.narrativeOverlap * 100).toFixed(1)}%`);
  console.log(`Stage agreement: ${(a.stageAgreement * 100).toFixed(1)}%`);
  console.log(`Avg confidence delta: ${a.avgConfidenceDelta.toFixed(1)} points`);
  console.log(`\nModel A (${modelA}): ${result.models[0].narratives.length} narratives, ${result.models[0].latencyMs}ms, $${result.models[0].costUsd.toFixed(4)}`);
  console.log(`Model B (${modelB}): ${result.models[1].narratives.length} narratives, ${result.models[1].latencyMs}ms, $${result.models[1].costUsd.toFixed(4)}`);
  if (a.uniqueToA.length > 0) console.log(`\nUnique to A: ${a.uniqueToA.join(', ')}`);
  if (a.uniqueToB.length > 0) console.log(`Unique to B: ${a.uniqueToB.join(', ')}`);
  console.log(`\nFull comparison: ${outPath}`);
}

const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('llm-compare.ts') || process.argv[1].endsWith('llm-compare.js'));
if (isDirectRun) main();
