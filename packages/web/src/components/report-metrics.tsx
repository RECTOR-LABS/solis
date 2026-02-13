import type { FortnightlyReport } from '@solis/shared';

const metricsConfig = [
  { key: 'narrativesIdentified' as const, label: 'Narratives', color: 'text-sol-purple', border: 'border-t-sol-purple' },
  { key: 'anomaliesDetected' as const, label: 'Anomalies', color: 'text-sol-green', border: 'border-t-sol-green' },
  { key: 'totalReposAnalyzed' as const, label: 'Repos Tracked', color: 'text-sol-blue', border: 'border-t-sol-blue' },
  { key: 'buildIdeasGenerated' as const, label: 'Build Ideas', color: 'text-sol-orange', border: 'border-t-sol-orange' },
];

export function ReportMetrics({ meta }: { meta: FortnightlyReport['meta'] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metricsConfig.map(({ key, label, color, border }) => (
        <div
          key={key}
          className={`backdrop-blur-md bg-white/[0.02] border border-white/[0.06] border-t-2 ${border} rounded-xl p-5 text-center`}
        >
          <div className={`text-3xl font-bold ${color}`}>{meta[key]}</div>
          <div className="text-xs text-sol-muted mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
