import type { Narrative } from '@solis/shared';

export interface SearchableNarrative {
  date: string;
  narrative: Narrative;
}

export function searchNarratives(items: SearchableNarrative[], query: string): SearchableNarrative[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase();
  return items.filter(({ narrative }) => {
    const fields = [
      narrative.name,
      narrative.description,
      ...narrative.relatedTokens,
      ...narrative.relatedProtocols,
      ...narrative.relatedRepos,
    ];
    return fields.some(f => f.toLowerCase().includes(q));
  });
}
