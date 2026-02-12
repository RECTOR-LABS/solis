import { notFound } from 'next/navigation';
import { getAllReports } from '@/lib/reports';
import { buildNarrativeTimeline } from '@/lib/timeline';
import { NarrativeTimelineView } from '@/components/narrative-timeline';

export const revalidate = 3600;

export async function generateStaticParams() {
  const reports = await getAllReports();
  const slugs = new Set<string>();

  for (const { report } of reports) {
    for (const narrative of report.narratives) {
      slugs.add(narrative.slug);
    }
  }

  return Array.from(slugs).map(slug => ({ slug }));
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const reports = await getAllReports();
  const timeline = buildNarrativeTimeline(slug, reports);

  if (!timeline) notFound();

  return (
    <div className="space-y-6">
      <a href="/archive" className="text-sol-muted hover:text-white text-sm transition-colors">
        &larr; Back to archive
      </a>
      <NarrativeTimelineView timeline={timeline} />
    </div>
  );
}
