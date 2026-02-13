import type { DataSource, DataSourceStatus, SignalLayer, FortnightlyReport } from '@solis/shared';

const layerConfig: Record<SignalLayer, { label: string; color: string; bg: string }> = {
  SOCIAL: { label: 'Social', color: 'text-orange-400', bg: 'bg-orange-400/10' },
  LEADING: { label: 'Leading', color: 'text-sol-purple', bg: 'bg-sol-purple/10' },
  COINCIDENT: { label: 'Coincident', color: 'text-sol-blue', bg: 'bg-sol-blue/10' },
  CONFIRMING: { label: 'Confirming', color: 'text-sol-green', bg: 'bg-sol-green/10' },
};

const statusConfig: Record<DataSourceStatus, { color: string; label: string }> = {
  success: { color: 'bg-sol-green', label: 'OK' },
  partial: { color: 'bg-yellow-400', label: 'Partial' },
  failed: { color: 'bg-red-400', label: 'Failed' },
};

interface DataSourcesCardProps {
  sources: DataSource[];
  meta: FortnightlyReport['meta'];
}

export function DataSourcesCard({ sources, meta }: DataSourcesCardProps) {
  return (
    <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      <h2 className="text-xl font-semibold mb-5">Data Sources</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sources.map(source => {
          const layer = layerConfig[source.layer];
          const status = statusConfig[source.status ?? 'success'];

          return (
            <div
              key={source.name}
              className="border border-sol-border rounded-lg p-4 bg-sol-card"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-white">{source.name}</span>
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-1.5 ${status.color}`} title={status.label} />
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${layer.bg} ${layer.color}`}>
                  {layer.label}
                </span>
                <span className="text-xs text-sol-muted font-mono">{source.dataPoints.toLocaleString()} pts</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* LLM footer */}
      <div className="mt-5 pt-4 border-t border-sol-border flex items-center gap-4 text-xs text-sol-muted">
        <span>LLM: <span className="text-white">{meta.llmModel}</span></span>
        <span className="text-sol-border">|</span>
        <span>Cost: <span className="text-white font-mono">${meta.llmCostUsd.toFixed(4)}</span></span>
        <span className="text-sol-border">|</span>
        <span>Duration: <span className="text-white font-mono">{(meta.pipelineDurationMs / 1000).toFixed(1)}s</span></span>
      </div>
    </div>
  );
}
