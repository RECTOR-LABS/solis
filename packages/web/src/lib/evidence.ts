import type {
  Narrative,
  FortnightlyReport,
  GitHubRepoSignal,
  TokenSignal,
  TVLSignal,
  DEXVolumeSignal,
  OnchainSignal,
  XTopicSignal,
  SocialSignal,
} from '@solis/shared';

export interface NarrativeEvidence {
  repos: GitHubRepoSignal[];
  tokens: TokenSignal[];
  tvl: TVLSignal[];
  dex: DEXVolumeSignal[];
  onchain: OnchainSignal[];
  x: XTopicSignal[];
  social: SocialSignal[];
}

type ReportSignals = FortnightlyReport['signals'];

/**
 * Fuzzy protocol match — "Jito" matches "Jito Tip Router", "jito-stake-pool", etc.
 * Case-insensitive containment check in both directions.
 */
export function protocolMatches(needle: string, haystack: string): boolean {
  const a = needle.toLowerCase();
  const b = haystack.toLowerCase();
  return b.includes(a) || a.includes(b);
}

/**
 * Cross-reference a narrative's relatedRepos/Tokens/Protocols against raw signals
 * to extract only the evidence relevant to that narrative.
 */
export function extractEvidence(
  narrative: Narrative,
  signals: ReportSignals,
): NarrativeEvidence {
  const repoSet = new Set(narrative.relatedRepos.map(r => r.toLowerCase()));
  const tokenSet = new Set(narrative.relatedTokens.map(t => t.toLowerCase()));
  const protocols = narrative.relatedProtocols;

  // Layer 1 — GitHub repos
  const repos = signals.leading.repos.filter(r =>
    repoSet.has(r.repo.toLowerCase()),
  );

  // Layer 3 — Tokens (match by symbol)
  const tokens = signals.confirming.tokens.filter(t =>
    tokenSet.has(t.symbol.toLowerCase()),
  );

  // Layer 2 — TVL protocols
  const tvl = signals.coincident.tvl.protocols.filter(p =>
    protocols.some(proto => protocolMatches(proto, p.protocol)),
  );

  // Layer 2 — DEX volumes
  const dex = signals.coincident.dexVolumes.protocols.filter(p =>
    protocols.some(proto => protocolMatches(proto, p.protocol)),
  );

  // Layer 2 — Onchain programs
  const onchain = signals.coincident.onchain.filter(p =>
    protocols.some(proto => protocolMatches(proto, p.programName)),
  );

  // Layer 0 — X/Twitter topics (match against narrative name + relatedTokens + relatedProtocols)
  const searchTerms = [
    narrative.name.toLowerCase(),
    ...narrative.relatedTokens.map(t => t.toLowerCase()),
    ...narrative.relatedProtocols.map(p => p.toLowerCase()),
  ];
  const x = (signals.x?.topics ?? []).filter(t =>
    searchTerms.some(term => protocolMatches(term, t.topic)),
  );

  // Layer 0 — Social (LunarCrush) topics
  const social = (signals.social?.coins ?? []).filter(c =>
    searchTerms.some(term => protocolMatches(term, c.topic)),
  );

  return { repos, tokens, tvl, dex, onchain, x, social };
}

export function hasEvidence(evidence: NarrativeEvidence): boolean {
  return evidenceCount(evidence) > 0;
}

export function evidenceCount(evidence: NarrativeEvidence): number {
  return (
    evidence.repos.length +
    evidence.tokens.length +
    evidence.tvl.length +
    evidence.dex.length +
    evidence.onchain.length +
    evidence.x.length +
    evidence.social.length
  );
}

/**
 * Format large numbers compactly: 1234 → "1.2K", 1234567 → "1.2M", 1234567890 → "1.2B"
 */
export function compactNumber(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${abs}`;
}
