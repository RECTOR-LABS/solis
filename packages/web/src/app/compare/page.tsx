import { getReport, getReportDates } from '@/lib/reports';
import { compareReports } from '@/lib/compare';
import { ComparisonView } from '@/components/comparison-view';

export const revalidate = 3600;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ dates?: string }>;
}) {
  const { dates: datesParam } = await searchParams;
  const allDates = await getReportDates();

  if (allDates.length < 2) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Compare Reports</h1>
        <div className="border border-sol-border rounded-lg p-8 bg-sol-card text-center">
          <p className="text-sol-muted">
            Need at least 2 reports to compare. Currently {allDates.length} report{allDates.length === 1 ? '' : 's'} available.
          </p>
        </div>
      </div>
    );
  }

  const parsed = datesParam?.split(',').filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const hasTwoDates = parsed && parsed.length === 2;

  if (!hasTwoDates) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Compare Reports</h1>
        <p className="text-sol-muted text-sm">Select two reports to compare side by side.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allDates.map(date => (
            <div key={date} className="border border-sol-border rounded-lg p-4 bg-sol-card">
              <span className="font-mono text-white">{date}</span>
            </div>
          ))}
        </div>
        <p className="text-sol-muted text-xs">
          Use the URL format: <code className="bg-sol-card px-1.5 py-0.5 rounded">/compare?dates=YYYY-MM-DD,YYYY-MM-DD</code>
        </p>
      </div>
    );
  }

  const [dateA, dateB] = parsed;
  const [reportA, reportB] = await Promise.all([getReport(dateA), getReport(dateB)]);

  if (!reportA || !reportB) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Compare Reports</h1>
        <div className="border border-sol-border rounded-lg p-8 bg-sol-card text-center">
          <p className="text-sol-muted">
            {!reportA && <span>Report for {dateA} not found. </span>}
            {!reportB && <span>Report for {dateB} not found.</span>}
          </p>
        </div>
      </div>
    );
  }

  const result = compareReports(reportA, reportB, dateA, dateB);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Compare Reports</h1>
      <ComparisonView result={result} />
    </div>
  );
}
