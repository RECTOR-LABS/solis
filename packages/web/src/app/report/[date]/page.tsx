import { notFound } from 'next/navigation';
import { getReport, getReportDates } from '@/lib/reports';
import { NarrativeCard } from '@/components/narrative-card';
import { BuildIdeaCard } from '@/components/build-ideas';
import { ReportTimestamp } from '@/components/report-timestamp';
import { ExportButtons } from '@/components/export-buttons';
import { extractEvidence } from '@/lib/evidence';

export const revalidate = 3600;

export async function generateStaticParams() {
  const dates = await getReportDates();
  return dates.map(date => ({ date }));
}

export default async function ReportPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const report = await getReport(date);

  if (!report) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">SOLIS Report</h1>
          <p className="text-sol-muted text-sm">
            {new Date(report.period.start).toLocaleDateString()} — {new Date(report.period.end).toLocaleDateString()}
          </p>
          <ReportTimestamp generatedAt={report.generatedAt} />
        </div>
        <div className="flex items-center gap-4">
          <ExportButtons report={report} date={date} />
          <a href="/archive" className="text-sol-muted hover:text-white text-sm transition-colors">
            View all reports
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-purple">{report.meta.narrativesIdentified}</div>
          <div className="text-xs text-sol-muted">Narratives</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-green">{report.meta.anomaliesDetected}</div>
          <div className="text-xs text-sol-muted">Anomalies</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-blue">{report.meta.totalReposAnalyzed}</div>
          <div className="text-xs text-sol-muted">Repos</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-orange">{report.meta.buildIdeasGenerated}</div>
          <div className="text-xs text-sol-muted">Ideas</div>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-4">Narratives</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.narratives.map(narrative => (
            <NarrativeCard
              key={narrative.id}
              narrative={narrative}
              evidence={extractEvidence(narrative, report.signals)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Build Ideas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.buildIdeas.map(idea => (
            <BuildIdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      </section>

      <section className="border border-sol-border rounded-lg p-6 bg-sol-card">
        <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sol-border text-sol-muted text-left">
                <th className="pb-2">Source</th>
                <th className="pb-2">Layer</th>
                <th className="pb-2 text-right">Data Points</th>
              </tr>
            </thead>
            <tbody>
              {report.sources.map(source => (
                <tr key={source.name} className="border-b border-sol-border/50">
                  <td className="py-2 text-white">{source.name}</td>
                  <td className="py-2 text-sol-muted">{source.layer}</td>
                  <td className="py-2 text-right font-mono">{source.dataPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-xs text-sol-muted">
          LLM: {report.meta.llmModel} | Cost: ${report.meta.llmCostUsd.toFixed(4)} | Duration: {(report.meta.pipelineDurationMs / 1000).toFixed(1)}s
        </div>
      </section>
    </div>
  );
}
