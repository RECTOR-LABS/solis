import { notFound } from 'next/navigation';
import { getReport, getReportDates } from '@/lib/reports';
import type { SignalStage } from '@solis/shared';
import { ReportHeader } from '@/components/report-header';
import { ReportNav } from '@/components/report-nav';
import { ReportMetrics } from '@/components/report-metrics';
import { ReportDiff } from '@/components/report-diff';
import { NarrativeStageGroup } from '@/components/narrative-stage-group';
import { BuildIdeasFilter } from '@/components/build-ideas-filter';
import { DataSourcesCard } from '@/components/data-sources-card';

export const revalidate = 3600;

export async function generateStaticParams() {
  const dates = await getReportDates();
  return dates.map(date => ({ date }));
}

const stageOrder: SignalStage[] = ['EARLY', 'EMERGING', 'GROWING', 'MAINSTREAM'];

export default async function ReportPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const report = await getReport(date);

  if (!report) notFound();

  // Prev/next navigation
  const dates = await getReportDates();
  const idx = dates.indexOf(date);
  const prevDate = idx < dates.length - 1 ? dates[idx + 1] : null;
  const nextDate = idx > 0 ? dates[idx - 1] : null;

  // Group narratives by stage
  const narrativesByStage = stageOrder.map(stage => ({
    stage,
    narratives: report.narratives.filter(n => n.stage === stage),
  }));

  // Determine if diff has meaningful content
  const hasDiff = !!(report.diff && (
    report.diff.stageTransitions.length > 0 ||
    report.diff.newNarratives.length > 0 ||
    report.diff.removedNarratives.length > 0 ||
    report.diff.confidenceChanges.some(c => Math.abs(c.delta) >= 10)
  ));

  return (
    <div className="space-y-6">
      <ReportHeader
        date={date}
        period={report.period}
        generatedAt={report.generatedAt}
        report={report}
        prevDate={prevDate}
        nextDate={nextDate}
      />

      <ReportNav hasDiff={hasDiff} />

      <section id="summary">
        <ReportMetrics meta={report.meta} />
      </section>

      {hasDiff && (
        <section id="changes">
          <ReportDiff diff={report.diff} />
        </section>
      )}

      <section id="narratives" className="space-y-6">
        <h2 className="text-xl font-semibold">Narratives</h2>
        {narrativesByStage.map(({ stage, narratives }) => (
          <NarrativeStageGroup
            key={stage}
            stage={stage}
            narratives={narratives}
            signals={report.signals}
          />
        ))}
      </section>

      <section id="ideas" className="space-y-4">
        <h2 className="text-xl font-semibold">Build Ideas</h2>
        <BuildIdeasFilter ideas={report.buildIdeas} />
      </section>

      <section id="sources">
        <DataSourcesCard sources={report.sources} meta={report.meta} />
      </section>
    </div>
  );
}
