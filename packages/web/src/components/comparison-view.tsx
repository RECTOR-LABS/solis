'use client';

import type { ComparisonResult, MetaDeltas } from '@/lib/compare';
import { StageBadge } from './stage-badge';

function DeltaArrow({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-sol-muted">=</span>;
  const color = delta > 0 ? 'text-sol-green' : 'text-red-400';
  const arrow = delta > 0 ? '+' : '';
  return <span className={`${color} font-mono text-sm`}>{arrow}{delta}</span>;
}

function MetaCard({ label, data }: { label: string; data: MetaDeltas[keyof MetaDeltas] }) {
  return (
    <div className="border border-sol-border rounded-lg p-4 bg-sol-card">
      <div className="text-xs text-sol-muted mb-2">{label}</div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-white">{data.a}</span>
        <DeltaArrow delta={data.delta} />
        <span className="font-mono text-white">{data.b}</span>
      </div>
    </div>
  );
}

export function ComparisonView({ result }: { result: ComparisonResult }) {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-center gap-4 text-sm text-sol-muted">
        <a href={`/report/${result.dateA}`} className="hover:text-white transition-colors font-mono">
          {result.dateA}
        </a>
        <span>vs</span>
        <a href={`/report/${result.dateB}`} className="hover:text-white transition-colors font-mono">
          {result.dateB}
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetaCard label="Narratives" data={result.metaDeltas.narratives} />
        <MetaCard label="Anomalies" data={result.metaDeltas.anomalies} />
        <MetaCard label="Repos" data={result.metaDeltas.repos} />
        <MetaCard label="Ideas" data={result.metaDeltas.ideas} />
      </div>

      {result.newNarratives.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-sol-green">
            New in {result.dateB} ({result.newNarratives.length})
          </h2>
          <div className="space-y-2">
            {result.newNarratives.map(n => (
              <div key={n.slug} className="flex items-center justify-between border border-sol-green/20 rounded-lg p-3 bg-sol-green/5">
                <span className="text-white text-sm">{n.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-sol-muted font-mono">{n.confidence}%</span>
                  <StageBadge stage={n.stage} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.removedNarratives.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-red-400">
            Removed since {result.dateA} ({result.removedNarratives.length})
          </h2>
          <div className="space-y-2">
            {result.removedNarratives.map(n => (
              <div key={n.slug} className="flex items-center justify-between border border-red-400/20 rounded-lg p-3 bg-red-400/5">
                <span className="text-sol-muted text-sm line-through">{n.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-sol-muted font-mono">{n.confidence}%</span>
                  <StageBadge stage={n.stage} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.shared.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Shared Narratives ({result.shared.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sol-border text-sol-muted text-left">
                  <th className="pb-2">Narrative</th>
                  <th className="pb-2 text-center">Stage</th>
                  <th className="pb-2 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.shared.map(s => (
                  <tr key={s.slug} className="border-b border-sol-border/50">
                    <td className="py-2 text-white">{s.name}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <StageBadge stage={s.stageA} />
                        {s.stageChanged && (
                          <>
                            <span className="text-sol-muted text-xs">→</span>
                            <StageBadge stage={s.stageB} />
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <span className="font-mono">{s.confidenceA}%</span>
                      {s.confidenceDelta !== 0 && (
                        <span className={`ml-1.5 font-mono text-xs ${s.confidenceDelta > 0 ? 'text-sol-green' : 'text-red-400'}`}>
                          {s.confidenceDelta > 0 ? '+' : ''}{s.confidenceDelta}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
