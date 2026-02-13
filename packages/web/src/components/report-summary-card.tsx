import { ReportTimestamp } from './report-timestamp';

interface ReportSummaryProps {
  meta: {
    narrativesIdentified: number;
    anomaliesDetected: number;
    totalReposAnalyzed: number;
    buildIdeasGenerated: number;
  };
  period: { start: string; end: string };
  generatedAt: string;
  reportDate: string;
}

export function ReportSummaryCard({ meta, period, generatedAt, reportDate }: ReportSummaryProps) {
  return (
    <section className="max-w-6xl mx-auto px-4">
      <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Latest Report</h2>
            <ReportTimestamp generatedAt={generatedAt} />
          </div>
          <span className="text-sol-muted text-sm hidden sm:inline">
            {new Date(period.start).toLocaleDateString()} — {new Date(period.end).toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
          <div>
            <div className="text-2xl font-bold text-sol-purple">{meta.narrativesIdentified}</div>
            <div className="text-xs text-sol-muted">Narratives</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-sol-green">{meta.anomaliesDetected}</div>
            <div className="text-xs text-sol-muted">Anomalies</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-sol-blue">{meta.totalReposAnalyzed}</div>
            <div className="text-xs text-sol-muted">Repos Tracked</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-sol-orange">{meta.buildIdeasGenerated}</div>
            <div className="text-xs text-sol-muted">Build Ideas</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <span className="text-xs text-sol-muted sm:hidden">
            {new Date(period.start).toLocaleDateString()} — {new Date(period.end).toLocaleDateString()}
          </span>
          <a
            href={`/report/${reportDate}`}
            className="text-sm text-sol-blue hover:text-white transition-colors ml-auto"
          >
            View Full Report →
          </a>
        </div>
      </div>
    </section>
  );
}
