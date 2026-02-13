import { getReport, getReportDates } from '@/lib/reports';
import { compareReports } from '@/lib/compare';
import { ComparisonView } from '@/components/comparison-view';
import { DatePicker } from '@/components/date-picker';

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
        <DatePicker dates={allDates} />
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
