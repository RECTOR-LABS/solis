import { logger } from '../logger.js';
import type {
  FortnightlyReport,
  GitHubSignals,
  CoincidentSignals,
  ConfirmingSignals,
} from '@solis/shared';

/**
 * Calculate delta values by comparing current signals against a previous report.
 * Mutates signals in place (same pattern as scoring.ts enrichWithZScores).
 * No-op if previousReport is null (first run).
 */
export function applyDeltas(
  leading: GitHubSignals,
  coincident: CoincidentSignals,
  confirming: ConfirmingSignals,
  previousReport: FortnightlyReport | null,
): void {
  if (!previousReport) {
    logger.child({ component: 'deltas' }).info('No previous report — skipping delta calculation');
    return;
  }

  const log = logger.child({ component: 'deltas' });

  // GitHub repo deltas — O(1) lookup by repo name
  const prevRepoMap = new Map(
    previousReport.signals.leading.repos.map(r => [r.repo, r]),
  );
  for (const repo of leading.repos) {
    const prev = prevRepoMap.get(repo.repo);
    if (!prev) continue;
    repo.starsDelta = repo.stars - prev.stars;
    repo.forksDelta = repo.forks - prev.forks;
    repo.contributorsDelta = repo.contributors - prev.contributors;
  }

  // Onchain tx deltas — O(1) lookup by programId
  const prevOnchainMap = new Map(
    previousReport.signals.coincident.onchain.map(s => [s.programId, s]),
  );
  for (const signal of coincident.onchain) {
    const prev = prevOnchainMap.get(signal.programId);
    if (!prev) continue;
    signal.txDelta = signal.txCount - prev.txCount;
  }

  // DEX volume deltas — percentage change
  const prevDexMap = new Map(
    previousReport.signals.coincident.dexVolumes.protocols.map(p => [p.protocol, p]),
  );
  for (const protocol of coincident.dexVolumes.protocols) {
    const prev = prevDexMap.get(protocol.protocol);
    if (!prev || prev.volume24h === 0) continue;
    protocol.volumeDelta = ((protocol.volume24h - prev.volume24h) / prev.volume24h) * 100;
  }

  // Token volume deltas — percentage change
  const prevTokenMap = new Map(
    previousReport.signals.confirming.tokens.map(t => [t.id, t]),
  );
  for (const token of confirming.tokens) {
    const prev = prevTokenMap.get(token.id);
    if (!prev || prev.volume24h === 0) continue;
    token.volumeDelta = ((token.volume24h - prev.volume24h) / prev.volume24h) * 100;
  }

  log.info({
    repos: leading.repos.length,
    onchain: coincident.onchain.length,
    dex: coincident.dexVolumes.protocols.length,
    tokens: confirming.tokens.length,
  }, 'Delta calculation complete');
}
