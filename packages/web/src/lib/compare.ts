import type { FortnightlyReport, Narrative, SignalStage } from '@solis/shared';

export interface ComparisonResult {
  dateA: string;
  dateB: string;
  newNarratives: Narrative[];
  removedNarratives: Narrative[];
  shared: SharedNarrative[];
  metaDeltas: MetaDeltas;
}

export interface SharedNarrative {
  slug: string;
  name: string;
  stageA: SignalStage;
  stageB: SignalStage;
  confidenceA: number;
  confidenceB: number;
  confidenceDelta: number;
  stageChanged: boolean;
}

export interface MetaDeltas {
  narratives: { a: number; b: number; delta: number };
  anomalies: { a: number; b: number; delta: number };
  repos: { a: number; b: number; delta: number };
  ideas: { a: number; b: number; delta: number };
}

export function compareReports(
  reportA: FortnightlyReport,
  reportB: FortnightlyReport,
  dateA: string,
  dateB: string,
): ComparisonResult {
  const slugsA = new Set(reportA.narratives.map(n => n.slug));
  const slugsB = new Set(reportB.narratives.map(n => n.slug));

  const mapA = new Map(reportA.narratives.map(n => [n.slug, n]));
  const mapB = new Map(reportB.narratives.map(n => [n.slug, n]));

  const newNarratives = reportB.narratives.filter(n => !slugsA.has(n.slug));
  const removedNarratives = reportA.narratives.filter(n => !slugsB.has(n.slug));

  const shared: SharedNarrative[] = [];
  for (const slug of slugsA) {
    if (slugsB.has(slug)) {
      const a = mapA.get(slug)!;
      const b = mapB.get(slug)!;
      shared.push({
        slug,
        name: b.name,
        stageA: a.stage,
        stageB: b.stage,
        confidenceA: a.confidence,
        confidenceB: b.confidence,
        confidenceDelta: b.confidence - a.confidence,
        stageChanged: a.stage !== b.stage,
      });
    }
  }

  const metaDeltas: MetaDeltas = {
    narratives: { a: reportA.meta.narrativesIdentified, b: reportB.meta.narrativesIdentified, delta: reportB.meta.narrativesIdentified - reportA.meta.narrativesIdentified },
    anomalies: { a: reportA.meta.anomaliesDetected, b: reportB.meta.anomaliesDetected, delta: reportB.meta.anomaliesDetected - reportA.meta.anomaliesDetected },
    repos: { a: reportA.meta.totalReposAnalyzed, b: reportB.meta.totalReposAnalyzed, delta: reportB.meta.totalReposAnalyzed - reportA.meta.totalReposAnalyzed },
    ideas: { a: reportA.meta.buildIdeasGenerated, b: reportB.meta.buildIdeasGenerated, delta: reportB.meta.buildIdeasGenerated - reportA.meta.buildIdeasGenerated },
  };

  return { dateA, dateB, newNarratives, removedNarratives, shared, metaDeltas };
}
