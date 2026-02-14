import { getAllReports } from '@/lib/reports';
import { MetaTrendsChart } from '@/components/charts/meta-trends';

export const revalidate = 3600;

export default async function TrendsPage() {
  const reports = await getAllReports();

  const data = reports
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, report }) => ({
      date,
      narratives: report.meta.narrativesIdentified,
      anomalies: report.meta.anomaliesDetected,
      llmCost: report.meta.llmCostUsd,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pipeline Trends</h1>
        <p className="text-sol-muted text-sm mt-1">
          Narrative detection, anomaly counts, and LLM cost across all reports
        </p>
      </div>

      {data.length === 0 ? (
        <div className="border border-sol-border rounded-lg bg-sol-card p-8 text-center text-sol-muted">
          No reports available yet
        </div>
      ) : (
        <MetaTrendsChart data={data} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-purple">{data.length}</div>
          <div className="text-xs text-sol-muted">Total Reports</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-green">
            {data.length > 0 ? Math.round(data.reduce((s, d) => s + d.narratives, 0) / data.length) : 0}
          </div>
          <div className="text-xs text-sol-muted">Avg Narratives</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-orange">
            {data.reduce((s, d) => s + d.anomalies, 0)}
          </div>
          <div className="text-xs text-sol-muted">Total Anomalies</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-blue">
            ${data.reduce((s, d) => s + d.llmCost, 0).toFixed(2)}
          </div>
          <div className="text-xs text-sol-muted">Total LLM Cost</div>
        </div>
      </div>
    </div>
  );
}
