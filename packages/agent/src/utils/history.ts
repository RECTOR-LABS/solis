import type { Narrative, ReportDiff, SignalStage } from '@solis/shared';

/**
 * Normalize a narrative name for fuzzy matching.
 * Strips case, punctuation, and common filler words.
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(the|a|an|on|in|of|for|and|solana)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple word-overlap similarity between two normalized strings.
 * Returns 0-1 where 1 = perfect overlap.
 */
function similarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter(Boolean));
  const wordsB = new Set(b.split(' ').filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return overlap / union; // Jaccard similarity
}

const MATCH_THRESHOLD = 0.4;

interface NarrativeMatch {
  current: Narrative;
  previous: Narrative | null;
}

/**
 * Match current narratives to previous ones by slug exact match,
 * then fall back to fuzzy name similarity.
 */
export function matchNarratives(
  current: Narrative[],
  previous: Narrative[],
): NarrativeMatch[] {
  const prevBySlug = new Map(previous.map(n => [n.slug, n]));
  const prevByNorm = new Map(previous.map(n => [normalize(n.name), n]));
  const matched = new Set<string>(); // track matched previous slugs

  return current.map(curr => {
    // Exact slug match
    const bySlug = prevBySlug.get(curr.slug);
    if (bySlug && !matched.has(bySlug.slug)) {
      matched.add(bySlug.slug);
      return { current: curr, previous: bySlug };
    }

    // Fuzzy name match
    const currNorm = normalize(curr.name);
    let bestMatch: Narrative | null = null;
    let bestScore = 0;

    for (const [prevNorm, prevNarrative] of prevByNorm) {
      if (matched.has(prevNarrative.slug)) continue;
      const score = similarity(currNorm, prevNorm);
      if (score > bestScore && score >= MATCH_THRESHOLD) {
        bestScore = score;
        bestMatch = prevNarrative;
      }
    }

    if (bestMatch) {
      matched.add(bestMatch.slug);
      return { current: curr, previous: bestMatch };
    }

    return { current: curr, previous: null };
  });
}

/**
 * Populate history fields on current narratives by comparing to previous report.
 * Mutates narratives in-place.
 */
export function populateHistory(
  narratives: Narrative[],
  previousNarratives: Narrative[],
  now: string,
): void {
  const matches = matchNarratives(narratives, previousNarratives);

  for (const { current, previous } of matches) {
    if (!previous) {
      current.isNew = true;
      continue;
    }

    current.isNew = false;
    current.previousStage = previous.stage;
    if (current.stage !== previous.stage) {
      current.stageChangedAt = now;
    }
  }
}

/**
 * Compute diff summary between current and previous narratives.
 */
export function computeReportDiff(
  currentNarratives: Narrative[],
  previousNarratives: Narrative[],
): ReportDiff {
  const matches = matchNarratives(currentNarratives, previousNarratives);
  const matchedPrevSlugs = new Set(
    matches.filter(m => m.previous).map(m => m.previous!.slug),
  );

  const newNarratives = matches
    .filter(m => !m.previous)
    .map(m => m.current.name);

  const removedNarratives = previousNarratives
    .filter(p => !matchedPrevSlugs.has(p.slug))
    .map(p => p.name);

  const stageTransitions = matches
    .filter(m => m.previous && m.current.stage !== m.previous.stage)
    .map(m => ({
      name: m.current.name,
      from: m.previous!.stage as SignalStage,
      to: m.current.stage as SignalStage,
    }));

  const confidenceChanges = matches
    .filter(m => m.previous && m.current.confidence !== m.previous.confidence)
    .map(m => ({
      name: m.current.name,
      delta: m.current.confidence - m.previous!.confidence,
    }));

  return {
    newNarratives,
    removedNarratives,
    stageTransitions,
    confidenceChanges,
  };
}
