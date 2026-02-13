import type { Narrative, FortnightlyReport } from '@solis/shared';
import { NarrativeCard } from './narrative-card';
import { extractEvidence } from '@/lib/evidence';

interface FeaturedNarrativesProps {
  narratives: Narrative[];
  signals: FortnightlyReport['signals'];
  reportDate: string;
}

export function FeaturedNarratives({ narratives, signals, reportDate }: FeaturedNarrativesProps) {
  const top4 = [...narratives]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);

  if (top4.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Featured Narratives</h2>
        <a
          href={`/report/${reportDate}`}
          className="text-sm text-sol-muted hover:text-white transition-colors"
        >
          View All Narratives →
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {top4.map(narrative => (
          <NarrativeCard
            key={narrative.id}
            narrative={narrative}
            evidence={extractEvidence(narrative, signals)}
          />
        ))}
      </div>
    </section>
  );
}
