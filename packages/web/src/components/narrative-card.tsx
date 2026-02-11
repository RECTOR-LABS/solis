import type { Narrative } from '@solis/shared';
import { StageBadge } from './stage-badge';
import { MomentumGauge } from './momentum-gauge';

export function NarrativeCard({ narrative }: { narrative: Narrative }) {
  return (
    <div className="border border-sol-border rounded-lg p-6 bg-sol-card hover:border-sol-purple/50 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h3 className="text-lg font-semibold text-white">{narrative.name}</h3>
        <StageBadge stage={narrative.stage} />
      </div>

      <p className="text-sol-muted text-sm mb-4">{narrative.description}</p>

      <div className="flex items-center gap-4 mb-4">
        <MomentumGauge momentum={narrative.momentum} />
        <span className="text-sm text-sol-muted">
          Confidence: <span className="text-white font-mono">{narrative.confidence}%</span>
        </span>
      </div>

      {narrative.signals.leading.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-sol-purple uppercase tracking-wide mb-1">Leading</h4>
          <ul className="text-xs text-sol-muted space-y-0.5">
            {narrative.signals.leading.slice(0, 3).map((s, i) => (
              <li key={i}>- {s}</li>
            ))}
          </ul>
        </div>
      )}

      {narrative.signals.coincident.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-sol-blue uppercase tracking-wide mb-1">Coincident</h4>
          <ul className="text-xs text-sol-muted space-y-0.5">
            {narrative.signals.coincident.slice(0, 3).map((s, i) => (
              <li key={i}>- {s}</li>
            ))}
          </ul>
        </div>
      )}

      {narrative.signals.confirming.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-sol-green uppercase tracking-wide mb-1">Confirming</h4>
          <ul className="text-xs text-sol-muted space-y-0.5">
            {narrative.signals.confirming.slice(0, 3).map((s, i) => (
              <li key={i}>- {s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-sol-border">
        {narrative.relatedTokens.slice(0, 5).map(token => (
          <span key={token} className="text-xs px-1.5 py-0.5 bg-sol-purple/10 text-sol-purple rounded">
            ${token}
          </span>
        ))}
        {narrative.relatedProtocols.slice(0, 3).map(proto => (
          <span key={proto} className="text-xs px-1.5 py-0.5 bg-sol-blue/10 text-sol-blue rounded">
            {proto}
          </span>
        ))}
      </div>
    </div>
  );
}
