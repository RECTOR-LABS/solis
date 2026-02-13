import type { ReportDiff as ReportDiffType } from '@solis/shared';
import { StageBadge } from './stage-badge';

export function ReportDiff({ diff }: { diff: ReportDiffType | undefined }) {
  if (!diff) return null;

  const significantConfidenceChanges = diff.confidenceChanges.filter(
    c => Math.abs(c.delta) >= 10,
  );

  const hasContent =
    diff.stageTransitions.length > 0 ||
    diff.newNarratives.length > 0 ||
    diff.removedNarratives.length > 0 ||
    significantConfidenceChanges.length > 0;

  if (!hasContent) return null;

  return (
    <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-5">What Changed</h2>

      <div className="space-y-6">
        {/* Stage Transitions */}
        {diff.stageTransitions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-sol-muted uppercase tracking-wide mb-3">Stage Transitions</h3>
            <div className="space-y-2">
              {diff.stageTransitions.map(t => (
                <div key={t.name} className="flex items-center gap-3 text-sm">
                  <span className="text-white">{t.name}</span>
                  <div className="flex items-center gap-1.5">
                    <StageBadge stage={t.from} />
                    <span className="text-sol-muted">→</span>
                    <StageBadge stage={t.to} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Signals */}
        {diff.newNarratives.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-sol-muted uppercase tracking-wide mb-3">New Signals</h3>
            <div className="space-y-2">
              {diff.newNarratives.map(name => (
                <div
                  key={name}
                  className="flex items-center gap-2 border border-sol-green/20 rounded-lg p-3 bg-sol-green/5"
                >
                  <span className="text-sol-green text-xs">+</span>
                  <span className="text-white text-sm">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faded Signals */}
        {diff.removedNarratives.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-sol-muted uppercase tracking-wide mb-3">Faded Signals</h3>
            <div className="space-y-2">
              {diff.removedNarratives.map(name => (
                <div
                  key={name}
                  className="flex items-center gap-2 border border-red-400/20 rounded-lg p-3 bg-red-400/5"
                >
                  <span className="text-red-400 text-xs">−</span>
                  <span className="text-sol-muted text-sm line-through">{name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Shifts */}
        {significantConfidenceChanges.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-sol-muted uppercase tracking-wide mb-3">Confidence Shifts</h3>
            <div className="space-y-2">
              {significantConfidenceChanges.map(c => {
                const isUp = c.delta > 0;
                const color = isUp ? 'text-sol-green' : 'text-red-400';
                const arrow = isUp ? '↑' : '↓';
                return (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span className="text-white">{c.name}</span>
                    <span className={`font-mono ${color}`}>
                      {arrow} {Math.abs(c.delta)} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
