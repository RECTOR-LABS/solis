import type { BuildIdea } from '@solis/shared';

const difficultyConfig = {
  beginner: { color: 'text-green-400', bg: 'bg-green-400/10' },
  intermediate: { color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  advanced: { color: 'text-red-400', bg: 'bg-red-400/10' },
};

export function BuildIdeaCard({ idea }: { idea: BuildIdea }) {
  const config = difficultyConfig[idea.difficulty];

  return (
    <div className="border border-sol-border rounded-lg p-5 bg-sol-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="font-semibold text-white">{idea.title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded ${config.bg} ${config.color} shrink-0`}>
          {idea.difficulty}
        </span>
      </div>

      <p className="text-sol-muted text-sm mb-3">{idea.description}</p>

      <div className="text-xs text-sol-muted mb-2">
        <span className="font-medium text-sol-green">Why now:</span> {idea.whyNow}
      </div>

      <div className="flex items-center gap-2 text-xs text-sol-muted">
        <span>{idea.timeframe}</span>
        <span className="text-sol-border">|</span>
        <span>{idea.techStack.join(', ')}</span>
      </div>
    </div>
  );
}
