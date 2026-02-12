// SOLIS — Shared type definitions
// Contract between @solis/agent and @solis/web

export type SignalStage =
  | 'EARLY'       // Layer 1 only — devs building before market notices
  | 'EMERGING'    // Layer 1 + 2 — builders + capital moving
  | 'GROWING'     // All 3 layers — gaining mainstream traction
  | 'MAINSTREAM'; // All 3 layers, high confidence — already priced in

export type SignalLayer = 'SOCIAL' | 'LEADING' | 'COINCIDENT' | 'CONFIRMING';

export type MomentumDirection = 'accelerating' | 'stable' | 'decelerating';

export type DataSourceStatus = 'success' | 'failed' | 'partial';

export interface DataSource {
  name: string;
  layer: SignalLayer;
  fetchedAt: string; // ISO 8601
  dataPoints: number;
  status?: DataSourceStatus;
  error?: string;
}

// --- Layer 0: Social (LunarCrush) ---

export interface SocialSignal {
  topic: string;
  interactions24h: number;
  interactionsDelta: number;
  interactionsZScore: number;
  sentiment: number; // 0-100
  socialDominance: number; // % of total crypto social volume
  galaxyScore: number; // LunarCrush composite (0-100)
  contributors: number;
  posts: number;
}

export interface SocialSignals {
  period: { start: string; end: string };
  coins: SocialSignal[];
  anomalies: SocialSignal[];
  topBySentiment: SocialSignal[];
}

// --- Layer 1: Leading (GitHub) ---

export interface GitHubRepoSignal {
  repo: string; // owner/name
  stars: number;
  starsDelta: number; // change in period
  starsZScore: number;
  commits: number;
  commitsDelta: number;
  commitsZScore: number;
  forks: number;
  forksDelta: number;
  forksZScore: number;
  contributors: number;
  contributorsDelta: number;
  newRepo: boolean; // created within the period
  language: string;
  topics: string[];
}

export interface GitHubSignals {
  period: { start: string; end: string };
  repos: GitHubRepoSignal[];
  anomalies: GitHubRepoSignal[]; // repos with z-score > 2 on any metric
  newRepoClusters: Array<{
    topic: string;
    repos: string[];
    count: number;
  }>;
}

// --- Layer 2: Coincident (DeFi Llama + Helius) ---

export interface TVLSignal {
  protocol: string;
  category: string;
  tvl: number;
  tvlDelta: number; // change in period
  tvlDeltaPercent: number;
  tvlZScore: number;
}

export interface DEXVolumeSignal {
  protocol: string;
  volume24h: number;
  volumeDelta: number;
  volumeZScore: number;
}

export interface OnchainSignal {
  programId: string;
  programName: string;
  txCount: number;
  txDelta: number;
  txZScore: number;
  uniqueSigners: number;
}

export interface CoincidentSignals {
  period: { start: string; end: string };
  tvl: {
    total: number;
    totalDelta: number;
    protocols: TVLSignal[];
    anomalies: TVLSignal[];
  };
  dexVolumes: {
    total: number;
    protocols: DEXVolumeSignal[];
  };
  stablecoinFlows: {
    netFlow: number;
    inflows: number;
    outflows: number;
  };
  onchain: OnchainSignal[];
}

// --- Layer 3: Confirming (CoinGecko) ---

export interface TokenSignal {
  id: string;
  symbol: string;
  name: string;
  price: number;
  priceDelta7d: number;
  priceDelta14d: number;
  volume24h: number;
  volumeDelta: number;
  volumeZScore: number;
  marketCap: number;
  category: string;
}

export interface ConfirmingSignals {
  period: { start: string; end: string };
  tokens: TokenSignal[];
  trending: TokenSignal[];
  categoryPerformance: Array<{
    category: string;
    marketCap: number;
    marketCapDelta: number;
    topTokens: string[];
  }>;
}

// --- Analysis Output ---

export interface Narrative {
  id: string;
  name: string; // e.g., "Solana DePIN Expansion"
  slug: string;
  description: string; // 2-3 sentence summary
  stage: SignalStage;
  momentum: MomentumDirection;
  confidence: number; // 0-100
  signals: {
    leading: string[]; // human-readable signal descriptions
    coincident: string[];
    confirming: string[];
    social: string[];
  };
  relatedRepos: string[]; // owner/name
  relatedTokens: string[]; // symbol
  relatedProtocols: string[];
  previousStage?: SignalStage; // from last report
  stageChangedAt?: string; // ISO 8601
  isNew?: boolean; // narrative didn't exist in prior report
}

export interface BuildIdea {
  id: string;
  title: string;
  narrative: string; // narrative ID
  description: string; // 2-3 sentences
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeframe: string; // e.g., "2-4 weeks"
  techStack: string[];
  existingProjects: string[]; // reference repos
  whyNow: string; // timing rationale
}

// --- Report Diff ---

export interface StageTransition {
  name: string;
  from: SignalStage;
  to: SignalStage;
}

export interface ConfidenceChange {
  name: string;
  delta: number; // positive = increased, negative = decreased
}

export interface ReportDiff {
  newNarratives: string[];
  removedNarratives: string[];
  stageTransitions: StageTransition[];
  confidenceChanges: ConfidenceChange[];
}

// --- Report ---

export interface FortnightlyReport {
  version: '1.0';
  generatedAt: string; // ISO 8601
  period: {
    start: string; // ISO 8601
    end: string;
  };
  sources: DataSource[];
  signals: {
    leading: GitHubSignals;
    coincident: CoincidentSignals;
    confirming: ConfirmingSignals;
    social?: SocialSignals;
  };
  narratives: Narrative[];
  buildIdeas: BuildIdea[];
  diff?: ReportDiff;
  meta: {
    totalReposAnalyzed: number;
    totalProtocolsAnalyzed: number;
    totalTokensAnalyzed: number;
    anomaliesDetected: number;
    narrativesIdentified: number;
    buildIdeasGenerated: number;
    llmModel: string;
    llmTokensUsed: number;
    llmCostUsd: number;
    pipelineDurationMs: number;
  };
}

// --- API Response Types ---

export interface ReportSummary {
  date: string;
  generatedAt: string; // ISO 8601
  period: { start: string; end: string };
  narrativeCount: number;
  topNarratives: Array<{ name: string; stage: SignalStage; momentum: MomentumDirection }>;
  buildIdeaCount: number;
}

export interface SignalsResponse {
  date: string;
  signals: FortnightlyReport['signals'];
}
