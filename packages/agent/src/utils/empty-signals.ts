import type {
  GitHubSignals,
  CoincidentSignals,
  ConfirmingSignals,
  OnchainSignal,
} from '@solis/shared';

/** Valid GitHubSignals with empty arrays — safe for scoring/clustering. */
export function emptyGitHubSignals(): GitHubSignals {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - 14);
  return {
    period: { start: start.toISOString(), end: now.toISOString() },
    repos: [],
    anomalies: [],
    newRepoClusters: [],
  };
}

/** Valid coincident signals (without onchain) — matches collectDefiLlama return type. */
export function emptyCoincidentSignals(): Omit<CoincidentSignals, 'onchain'> {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - 14);
  return {
    period: { start: start.toISOString(), end: now.toISOString() },
    tvl: { total: 0, totalDelta: 0, protocols: [], anomalies: [] },
    dexVolumes: { total: 0, protocols: [] },
    stablecoinFlows: { netFlow: 0, inflows: 0, outflows: 0 },
  };
}

/** Empty onchain signals array. */
export function emptyOnchainSignals(): OnchainSignal[] {
  return [];
}

/** Valid ConfirmingSignals with empty arrays. */
export function emptyConfirmingSignals(): ConfirmingSignals {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - 14);
  return {
    period: { start: start.toISOString(), end: now.toISOString() },
    tokens: [],
    trending: [],
    categoryPerformance: [],
  };
}
