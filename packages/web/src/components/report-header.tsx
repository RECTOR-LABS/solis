import type { FortnightlyReport } from '@solis/shared';
import { ExportButtons } from './export-buttons';
import { ReportTimestamp } from './report-timestamp';

interface ReportHeaderProps {
  date: string;
  period: FortnightlyReport['period'];
  generatedAt: string;
  report: FortnightlyReport;
  prevDate: string | null;
  nextDate: string | null;
}

export function ReportHeader({ date, period, generatedAt, report, prevDate, nextDate }: ReportHeaderProps) {
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const periodStart = new Date(period.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const periodEnd = new Date(period.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="backdrop-blur-md bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-sol-muted mb-4">
        <a href="/" className="hover:text-white transition-colors">Home</a>
        <span>/</span>
        <a href="/archive" className="hover:text-white transition-colors">Archive</a>
        <span>/</span>
        <span className="text-white">{displayDate}</span>
      </nav>

      {/* Title row with prev/next nav */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          {prevDate ? (
            <a
              href={`/report/${prevDate}`}
              className="text-sol-muted hover:text-white transition-colors p-1"
              title={`Previous: ${prevDate}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
          ) : (
            <span className="w-7" />
          )}

          <div>
            <h1 className="text-2xl font-bold text-white">SOLIS Report</h1>
            <p className="text-sol-muted text-sm">{periodStart} — {periodEnd}</p>
          </div>

          {nextDate ? (
            <a
              href={`/report/${nextDate}`}
              className="text-sol-muted hover:text-white transition-colors p-1"
              title={`Next: ${nextDate}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ) : (
            <span className="w-7" />
          )}
        </div>

        <div className="flex items-center gap-4">
          <ExportButtons report={report} date={date} />
          <ReportTimestamp generatedAt={generatedAt} />
        </div>
      </div>
    </div>
  );
}
