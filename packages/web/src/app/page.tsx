import { getLatestReport, getReportDates } from '@/lib/reports';
import { HeroSection } from '@/components/hero-section';
import { ScrollIndicator } from '@/components/scroll-indicator';
import { SignalPipeline } from '@/components/signal-pipeline';
import { ReportSummaryCard } from '@/components/report-summary-card';
import { FeaturedNarratives } from '@/components/featured-narratives';
import { BuildIdeasHighlight } from '@/components/build-ideas-highlight';
import { MethodologyTrust } from '@/components/methodology-trust';
import { OpenSourceCTA } from '@/components/open-source-cta';

export const revalidate = 3600;

export default async function HomePage() {
  const report = await getLatestReport();
  const dates = await getReportDates();
  const reportDate = dates[0] ?? null;

  return (
    <div className="-mx-4 -mt-8 space-y-16">
      {/* Section 1: Hero — full bleed */}
      <HeroSection
        narrativeCount={report?.meta.narrativesIdentified ?? 0}
        anomalyCount={report?.meta.anomaliesDetected ?? 0}
        reposTracked={report?.meta.totalReposAnalyzed ?? 0}
        generatedAt={report?.generatedAt}
        reportDate={reportDate ?? undefined}
      />
      <ScrollIndicator />

      {/* Section 2: Signal Pipeline — contained */}
      <SignalPipeline />

      {report && reportDate ? (
        <>
          {/* Section 3: Report Summary — contained */}
          <ReportSummaryCard
            meta={report.meta}
            period={report.period}
            generatedAt={report.generatedAt}
            reportDate={reportDate}
          />

          {/* Section 4: Featured Narratives — contained */}
          <FeaturedNarratives
            narratives={report.narratives}
            signals={report.signals}
            reportDate={reportDate}
          />

          {/* Section 5: Build Ideas — contained */}
          <BuildIdeasHighlight
            ideas={report.buildIdeas}
            reportDate={reportDate}
          />
        </>
      ) : (
        <section className="max-w-6xl mx-auto px-4">
          <div className="border border-sol-border rounded-lg p-8 bg-sol-card text-center">
            <p className="text-sol-muted">
              First report generating soon. Check back after the next pipeline run.
            </p>
          </div>
        </section>
      )}

      {/* Section 6: Methodology & Trust — contained */}
      <MethodologyTrust />

      {/* Section 7: Open Source CTA — full bleed */}
      <OpenSourceCTA />
    </div>
  );
}
