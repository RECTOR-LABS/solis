import type {
  GitHubSignals,
  CoincidentSignals,
  ConfirmingSignals,
  SocialSignals,
  XSignals,
  GitHubRepoSignal,
  TVLSignal,
  OnchainSignal,
  SocialSignal,
  XTopicSignal,
} from '@solis/shared';
import {
  detectAnomalies,
  enrichWithZScores,
  type AnomalyResult,
} from './anomaly.js';
import { logger } from '../logger.js';

export interface ScoredSignals {
  leading: GitHubSignals;
  coincident: CoincidentSignals;
  confirming: ConfirmingSignals;
  social?: SocialSignals;
  x?: XSignals;
  summary: {
    socialAnomalies: number;
    xAnomalies: number;
    leadingAnomalies: number;
    coincidentAnomalies: number;
    confirmingAnomalies: number;
    totalAnomalies: number;
  };
}

/**
 * Enrich all signal layers with z-scores and detect anomalies.
 * This is the pure-math scoring step — no LLM involved.
 */
export function scoreSignals(
  leading: GitHubSignals,
  coincident: CoincidentSignals,
  confirming: ConfirmingSignals,
  threshold: number = 2.0,
  social?: SocialSignals,
  x?: XSignals,
): ScoredSignals {
  const log = logger.child({ component: 'scoring' });

  // === Layer 0: Social z-scores (optional) ===
  let socialAnomalies = 0;
  if (social && social.coins.length > 0) {
    enrichWithZScores(
      social.coins,
      s => s.interactionsDelta,
      (s, z) => { s.interactionsZScore = z; },
    );

    const interactionAnomalies: AnomalyResult<SocialSignal>[] = detectAnomalies(
      social.coins,
      s => s.interactionsDelta,
      'social_interactions',
      threshold,
    );

    const uniqueAnomalyTopics = new Map<string, SocialSignal>();
    for (const a of interactionAnomalies) {
      uniqueAnomalyTopics.set(a.item.topic, a.item);
    }
    social.anomalies = [...uniqueAnomalyTopics.values()];
    socialAnomalies = social.anomalies.length;

    log.info({
      socialAnomalies,
    }, 'Layer 0 scored');
  }

  // === Layer 0: X/Twitter z-scores (optional) ===
  let xAnomalies = 0;
  if (x && x.topics.length > 0) {
    enrichWithZScores(
      x.topics,
      t => t.tweetCountDelta,
      (t, z) => { t.tweetCountZScore = z; },
    );
    enrichWithZScores(
      x.topics,
      t => t.engagementDelta,
      (t, z) => { t.engagementZScore = z; },
    );

    const tweetAnomalies: AnomalyResult<XTopicSignal>[] = detectAnomalies(
      x.topics,
      t => t.tweetCountDelta,
      'x_tweets',
      threshold,
    );
    const engagementAnomalies: AnomalyResult<XTopicSignal>[] = detectAnomalies(
      x.topics,
      t => t.engagementDelta,
      'x_engagement',
      threshold,
    );

    const uniqueXAnomalies = new Map<string, XTopicSignal>();
    for (const a of [...tweetAnomalies, ...engagementAnomalies]) {
      uniqueXAnomalies.set(a.item.topic, a.item);
    }
    x.anomalies = [...uniqueXAnomalies.values()];
    xAnomalies = x.anomalies.length;

    log.info({ xAnomalies }, 'Layer 0 (X) scored');
  }

  // === Layer 1: GitHub z-scores ===
  enrichWithZScores(
    leading.repos,
    r => r.commitsDelta,
    (r, z) => { r.commitsZScore = z; },
  );
  enrichWithZScores(
    leading.repos,
    r => r.starsDelta,
    (r, z) => { r.starsZScore = z; },
  );
  enrichWithZScores(
    leading.repos,
    r => r.forksDelta,
    (r, z) => { r.forksZScore = z; },
  );

  const githubAnomalies: AnomalyResult<GitHubRepoSignal>[] = [
    ...detectAnomalies(leading.repos, r => r.commitsDelta, 'commits', threshold),
    ...detectAnomalies(leading.repos, r => r.starsDelta, 'stars', threshold),
    ...detectAnomalies(leading.repos, r => r.forksDelta, 'forks', threshold),
  ];

  // Deduplicate anomaly repos
  const uniqueAnomalyRepos = new Map<string, GitHubRepoSignal>();
  for (const a of githubAnomalies) {
    uniqueAnomalyRepos.set(a.item.repo, a.item);
  }
  leading.anomalies = [...uniqueAnomalyRepos.values()];

  // Cluster new repos by topic
  const newRepos = leading.repos.filter(r => r.newRepo);
  const topicClusters = new Map<string, string[]>();
  for (const repo of newRepos) {
    for (const topic of repo.topics) {
      const existing = topicClusters.get(topic) ?? [];
      existing.push(repo.repo);
      topicClusters.set(topic, existing);
    }
  }
  leading.newRepoClusters = [...topicClusters.entries()]
    .filter(([, repos]) => repos.length >= 2)
    .map(([topic, repos]) => ({ topic, repos, count: repos.length }))
    .sort((a, b) => b.count - a.count);

  log.info({
    repoAnomalies: leading.anomalies.length,
    newRepoClusters: leading.newRepoClusters.length,
  }, 'Layer 1 scored');

  // === Layer 2: DeFi Llama + Helius z-scores ===
  enrichWithZScores(
    coincident.tvl.protocols,
    p => p.tvlDeltaPercent,
    (p, z) => { p.tvlZScore = z; },
  );

  const tvlAnomalies: AnomalyResult<TVLSignal>[] = detectAnomalies(
    coincident.tvl.protocols,
    p => p.tvlDeltaPercent,
    'tvl_change',
    threshold,
  );
  coincident.tvl.anomalies = tvlAnomalies.map(a => a.item);

  enrichWithZScores(
    coincident.dexVolumes.protocols,
    p => p.volume24h,
    (p, z) => { p.volumeZScore = z; },
  );

  enrichWithZScores(
    coincident.onchain,
    s => s.txCount,
    (s, z) => { s.txZScore = z; },
  );

  const onchainAnomalies: AnomalyResult<OnchainSignal>[] = detectAnomalies(
    coincident.onchain,
    s => s.txCount,
    'program_activity',
    threshold,
  );

  log.info({
    tvlAnomalies: tvlAnomalies.length,
    onchainAnomalies: onchainAnomalies.length,
  }, 'Layer 2 scored');

  // === Layer 3: CoinGecko z-scores ===
  enrichWithZScores(
    confirming.tokens,
    t => t.volume24h,
    (t, z) => { t.volumeZScore = z; },
  );

  const tokenVolumeAnomalies = detectAnomalies(
    confirming.tokens,
    t => t.volume24h,
    'token_volume',
    threshold,
  );

  log.info({
    tokenVolumeAnomalies: tokenVolumeAnomalies.length,
  }, 'Layer 3 scored');

  const totalAnomalies =
    socialAnomalies +
    xAnomalies +
    leading.anomalies.length +
    tvlAnomalies.length +
    onchainAnomalies.length +
    tokenVolumeAnomalies.length;

  log.info({ totalAnomalies }, 'All layers scored');

  return {
    leading,
    coincident,
    confirming,
    ...(social ? { social } : {}),
    ...(x ? { x } : {}),
    summary: {
      socialAnomalies,
      xAnomalies,
      leadingAnomalies: leading.anomalies.length,
      coincidentAnomalies: tvlAnomalies.length + onchainAnomalies.length,
      confirmingAnomalies: tokenVolumeAnomalies.length,
      totalAnomalies,
    },
  };
}
