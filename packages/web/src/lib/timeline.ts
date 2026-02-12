import type { FortnightlyReport, SignalStage, MomentumDirection } from '@solis/shared';

export interface TimelinePoint {
  date: string;
  stage: SignalStage;
  confidence: number;
  momentum: MomentumDirection;
  isNew: boolean;
}

export interface NarrativeTimeline {
  slug: string;
  name: string;
  points: TimelinePoint[];
  firstSeen: string;
  lastSeen: string;
  peakConfidence: number;
  stageTransitions: Array<{ date: string; from: SignalStage; to: SignalStage }>;
}

export function buildNarrativeTimeline(
  slug: string,
  reports: Array<{ date: string; report: FortnightlyReport }>,
): NarrativeTimeline | null {
  const points: TimelinePoint[] = [];

  // Reports should be sorted oldest-first for timeline
  const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));

  for (const { date, report } of sorted) {
    const narrative = report.narratives.find(n => n.slug === slug);
    if (narrative) {
      points.push({
        date,
        stage: narrative.stage,
        confidence: narrative.confidence,
        momentum: narrative.momentum,
        isNew: narrative.isNew ?? false,
      });
    }
  }

  if (points.length === 0) return null;

  const stageTransitions: NarrativeTimeline['stageTransitions'] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i].stage !== points[i - 1].stage) {
      stageTransitions.push({
        date: points[i].date,
        from: points[i - 1].stage,
        to: points[i].stage,
      });
    }
  }

  return {
    slug,
    name: [...sorted].reverse().find(r => r.report.narratives.some(n => n.slug === slug))
      ?.report.narratives.find(n => n.slug === slug)?.name ?? slug,
    points,
    firstSeen: points[0].date,
    lastSeen: points[points.length - 1].date,
    peakConfidence: Math.max(...points.map(p => p.confidence)),
    stageTransitions,
  };
}
