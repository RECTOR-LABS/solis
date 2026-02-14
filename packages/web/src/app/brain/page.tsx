import { getLatestReport } from '@/lib/reports';
import { buildGraphData } from '@/lib/graph';
import { KnowledgeGraph } from '@/components/knowledge-graph';

export const revalidate = 3600;

export default async function BrainPage() {
  const report = await getLatestReport();

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="border border-sol-border rounded-lg bg-sol-card p-8 text-center text-sol-muted">
          No reports available yet. Run the pipeline to generate data.
        </div>
      </div>
    );
  }

  const graphData = buildGraphData(report);

  return (
    <div className="-mx-4 -mt-8 space-y-0">
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold">Knowledge Graph</h1>
        <p className="text-sol-muted text-sm mt-1">
          Interactive map of narratives, repos, tokens, and protocols from the latest report.
          Click narratives for timeline, repos for GitHub.
        </p>
      </div>
      <KnowledgeGraph data={graphData} />
    </div>
  );
}
