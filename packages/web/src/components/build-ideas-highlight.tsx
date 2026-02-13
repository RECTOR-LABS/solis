import type { BuildIdea } from '@solis/shared';
import { BuildIdeaCard } from './build-ideas';

interface BuildIdeasHighlightProps {
  ideas: BuildIdea[];
  reportDate: string;
}

export function BuildIdeasHighlight({ ideas, reportDate }: BuildIdeasHighlightProps) {
  const top3 = ideas.slice(0, 3);

  if (top3.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Build Ideas</h2>
        <a
          href={`/report/${reportDate}`}
          className="text-sm text-sol-muted hover:text-white transition-colors"
        >
          Explore All Ideas →
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map(idea => (
          <BuildIdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </section>
  );
}
