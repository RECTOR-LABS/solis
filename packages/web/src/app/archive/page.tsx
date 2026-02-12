import { getReportSummaries } from '@/lib/reports';
import { StageBadge } from '@/components/stage-badge';
import { ReportTimestamp } from '@/components/report-timestamp';

export const revalidate = 3600;

export default async function ArchivePage() {
  const summaries = await getReportSummaries();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Report Archive</h1>

      {summaries.length === 0 ? (
        <p className="text-sol-muted">No reports generated yet.</p>
      ) : (
        <div className="space-y-4">
          {summaries.map(summary => (
            <a
              key={summary.date}
              href={`/report/${summary.date}`}
              className="block border border-sol-border rounded-lg p-5 bg-sol-card hover:border-sol-purple/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-white">{summary.date}</h2>
                  <ReportTimestamp generatedAt={summary.generatedAt} />
                </div>
                <span className="text-sol-muted text-sm">
                  {new Date(summary.period.start).toLocaleDateString()} — {new Date(summary.period.end).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-sol-muted mb-3">
                <span>{summary.narrativeCount} narratives</span>
                <span>{summary.buildIdeaCount} build ideas</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.topNarratives.map(n => (
                  <div key={n.name} className="flex items-center gap-1.5">
                    <StageBadge stage={n.stage} />
                    <span className="text-sm text-white">{n.name}</span>
                  </div>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
