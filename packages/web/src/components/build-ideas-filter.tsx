'use client';

import { useState } from 'react';
import type { BuildIdea } from '@solis/shared';
import { BuildIdeaCard } from './build-ideas';

type Difficulty = BuildIdea['difficulty'];
type FilterValue = 'all' | Difficulty;

const filterConfig: Array<{ value: FilterValue; label: string; color: string; activeColor: string }> = [
  { value: 'all', label: 'All', color: 'text-sol-muted hover:text-white', activeColor: 'bg-white/10 text-white' },
  { value: 'beginner', label: 'Beginner', color: 'text-sol-muted hover:text-green-400', activeColor: 'bg-green-400/10 text-green-400' },
  { value: 'intermediate', label: 'Intermediate', color: 'text-sol-muted hover:text-yellow-400', activeColor: 'bg-yellow-400/10 text-yellow-400' },
  { value: 'advanced', label: 'Advanced', color: 'text-sol-muted hover:text-red-400', activeColor: 'bg-red-400/10 text-red-400' },
];

export function BuildIdeasFilter({ ideas }: { ideas: BuildIdea[] }) {
  const [filter, setFilter] = useState<FilterValue>('all');

  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.difficulty === filter);

  const counts: Record<FilterValue, number> = {
    all: ideas.length,
    beginner: ideas.filter(i => i.difficulty === 'beginner').length,
    intermediate: ideas.filter(i => i.difficulty === 'intermediate').length,
    advanced: ideas.filter(i => i.difficulty === 'advanced').length,
  };

  return (
    <div>
      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {filterConfig.map(({ value, label, color, activeColor }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
              filter === value ? activeColor : color
            }`}
          >
            {label}
            <span className="text-xs font-mono opacity-70">{counts[value]}</span>
          </button>
        ))}
      </div>

      {/* Ideas grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(idea => (
          <BuildIdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </div>
  );
}
