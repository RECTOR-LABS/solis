'use client';

import { useState } from 'react';
import type {
  GitHubRepoSignal,
  TokenSignal,
  XTopicSignal,
  SocialSignal,
} from '@solis/shared';
import type { NarrativeEvidence } from '@/lib/evidence';
import { compactNumber, hasEvidence, evidenceCount } from '@/lib/evidence';

// --- Primitives ---

function ZScoreBar({ z }: { z: number }) {
  const abs = Math.min(Math.abs(z), 5);
  const widthPercent = (abs / 5) * 100;
  const color =
    z >= 2 ? 'bg-sol-green' : z >= 0 ? 'bg-sol-muted/40' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-20 h-1.5 bg-sol-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-sol-muted w-8">
        z:{z.toFixed(1)}
      </span>
    </div>
  );
}

function DeltaBadge({ delta, percent }: { delta: number; percent?: number }) {
  if (delta === 0) return <span className="text-sol-muted text-xs">=</span>;
  const isPositive = delta > 0;
  const color = isPositive ? 'text-sol-green' : 'text-red-400';
  const prefix = isPositive ? '+' : '';
  const label = percent !== undefined
    ? `${prefix}${percent.toFixed(1)}%`
    : `${prefix}${compactNumber(delta)}`;
  return <span className={`text-xs font-mono ${color}`}>{label}</span>;
}

// --- Row Renderers ---

function RepoRow({ repo }: { repo: GitHubRepoSignal }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white font-mono truncate">{repo.repo}</span>
        {repo.language && (
          <span className="text-sol-muted shrink-0">{repo.language}</span>
        )}
        {repo.newRepo && (
          <span className="text-sol-green text-[10px] shrink-0">NEW</span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sol-muted">
          &#9733;{compactNumber(repo.stars)}
        </span>
        <span className="text-sol-muted">
          Commits {repo.commits}{' '}
          <DeltaBadge delta={repo.commitsDelta} />
        </span>
        <ZScoreBar z={repo.commitsZScore} />
      </div>
    </div>
  );
}

function TokenRow({ token }: { token: TokenSignal }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white font-mono">${token.symbol}</span>
        <span className="text-sol-muted font-mono">
          ${token.price < 0.01 ? token.price.toFixed(6) : token.price.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sol-muted">
          7d: <DeltaBadge delta={token.priceDelta7d} percent={token.priceDelta7d} />
        </span>
        <span className="text-sol-muted">
          Vol: {compactNumber(token.volume24h)}
        </span>
        <ZScoreBar z={token.volumeZScore} />
      </div>
    </div>
  );
}

function ProtocolRow({
  name,
  source,
  metric,
  metricLabel,
  delta,
  z,
}: {
  name: string;
  source: string;
  metric: number;
  metricLabel: string;
  delta: number;
  z: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white truncate">{name}</span>
        <span className="text-sol-muted text-[10px]">({source})</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sol-muted">
          {metricLabel}: {compactNumber(metric)}
        </span>
        <DeltaBadge delta={delta} />
        <ZScoreBar z={z} />
      </div>
    </div>
  );
}

function XTopicRow({ topic }: { topic: XTopicSignal }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white truncate">{topic.topic}</span>
        {topic.verifiedAuthors > 0 && (
          <span className="text-sol-blue text-[10px] shrink-0">
            &#10003;{topic.verifiedAuthors}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sol-muted">
          {topic.tweetCount} tweets
        </span>
        <span className="text-sol-muted">
          Eng: {compactNumber(topic.totalEngagement)}
        </span>
        <ZScoreBar z={topic.engagementZScore} />
      </div>
    </div>
  );
}

function SocialRow({ coin }: { coin: SocialSignal }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-white truncate">{coin.topic}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sol-muted">
          Int: {compactNumber(coin.interactions24h)}
        </span>
        <span className="text-sol-muted">
          Sent: {coin.sentiment}
        </span>
        <ZScoreBar z={coin.interactionsZScore} />
      </div>
    </div>
  );
}

// --- Layer Section ---

function LayerSection({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className={`text-[10px] font-medium uppercase tracking-wider ${color} mb-1`}>
        {label}
      </div>
      <div className="divide-y divide-sol-border/50">{children}</div>
    </div>
  );
}

// --- Main Panel ---

export function EvidencePanel({ evidence }: { evidence: NarrativeEvidence }) {
  const [expanded, setExpanded] = useState(false);

  if (!hasEvidence(evidence)) return null;

  const count = evidenceCount(evidence);

  return (
    <div className="mt-3 pt-3 border-t border-sol-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-sol-muted hover:text-white transition-colors w-full"
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>
          View Evidence ({count} signal{count !== 1 ? 's' : ''})
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1">
          {evidence.social.length > 0 && (
            <LayerSection label="Social" color="text-sol-orange">
              {evidence.social.map((c, i) => (
                <SocialRow key={i} coin={c} />
              ))}
            </LayerSection>
          )}

          {evidence.x.length > 0 && (
            <LayerSection label="X/Twitter" color="text-sol-orange">
              {evidence.x.map((t, i) => (
                <XTopicRow key={i} topic={t} />
              ))}
            </LayerSection>
          )}

          {evidence.repos.length > 0 && (
            <LayerSection label="Leading" color="text-sol-purple">
              {evidence.repos.map(r => (
                <RepoRow key={r.repo} repo={r} />
              ))}
            </LayerSection>
          )}

          {(evidence.tvl.length > 0 || evidence.dex.length > 0 || evidence.onchain.length > 0) && (
            <LayerSection label="Coincident" color="text-sol-blue">
              {evidence.tvl.map(p => (
                <ProtocolRow
                  key={`tvl-${p.protocol}`}
                  name={p.protocol}
                  source="TVL"
                  metric={p.tvl}
                  metricLabel="TVL"
                  delta={p.tvlDelta}
                  z={p.tvlZScore}
                />
              ))}
              {evidence.dex.map(p => (
                <ProtocolRow
                  key={`dex-${p.protocol}`}
                  name={p.protocol}
                  source="DEX"
                  metric={p.volume24h}
                  metricLabel="Vol"
                  delta={p.volumeDelta}
                  z={p.volumeZScore}
                />
              ))}
              {evidence.onchain.map(p => (
                <ProtocolRow
                  key={`onchain-${p.programId}`}
                  name={p.programName}
                  source="Onchain"
                  metric={p.txCount}
                  metricLabel="Tx"
                  delta={p.txDelta}
                  z={p.txZScore}
                />
              ))}
            </LayerSection>
          )}

          {evidence.tokens.length > 0 && (
            <LayerSection label="Confirming" color="text-sol-green">
              {evidence.tokens.map(t => (
                <TokenRow key={t.id} token={t} />
              ))}
            </LayerSection>
          )}
        </div>
      )}
    </div>
  );
}
