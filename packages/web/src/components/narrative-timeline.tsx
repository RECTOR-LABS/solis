'use client';

import type { NarrativeTimeline } from '@/lib/timeline';
import { StageBadge } from './stage-badge';
import type { SignalStage } from '@solis/shared';

const stageOrder: Record<SignalStage, number> = {
  EARLY: 0,
  EMERGING: 1,
  GROWING: 2,
  MAINSTREAM: 3,
};

const stageColors: Record<SignalStage, string> = {
  EARLY: 'bg-blue-400',
  EMERGING: 'bg-yellow-400',
  GROWING: 'bg-orange-400',
  MAINSTREAM: 'bg-red-400',
};

export function NarrativeTimelineView({ timeline }: { timeline: NarrativeTimeline }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">{timeline.name}</h1>
        <div className="flex items-center gap-4 text-sm text-sol-muted">
          <span>First seen: <span className="text-white font-mono">{timeline.firstSeen}</span></span>
          <span>Last seen: <span className="text-white font-mono">{timeline.lastSeen}</span></span>
          <span>Peak: <span className="text-white font-mono">{timeline.peakConfidence}%</span></span>
        </div>
      </div>

      {/* Stage Progression */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Stage Progression</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {timeline.points.map((point, i) => (
            <div key={point.date} className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-4 h-4 rounded-full ${stageColors[point.stage]} ring-2 ring-sol-dark`} />
                <span className="text-[10px] text-sol-muted font-mono">{point.date}</span>
                <StageBadge stage={point.stage} />
              </div>
              {i < timeline.points.length - 1 && (
                <div className="w-8 h-0.5 bg-sol-border shrink-0 -mt-6" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Confidence Trend */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Confidence Trend</h2>
        <div className="space-y-2">
          {timeline.points.map(point => (
            <div key={point.date} className="flex items-center gap-3">
              <span className="text-xs font-mono text-sol-muted w-24 shrink-0">{point.date}</span>
              <div className="flex-1 h-6 bg-sol-card rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${stageColors[point.stage]}/30`}
                  style={{ width: `${point.confidence}%` }}
                />
              </div>
              <span className="text-sm font-mono text-white w-10 text-right">{point.confidence}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stage Transitions */}
      {timeline.stageTransitions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Stage Transitions</h2>
          <div className="space-y-2">
            {timeline.stageTransitions.map((t, i) => (
              <div key={i} className="flex items-center gap-3 border border-sol-border rounded-lg p-3 bg-sol-card">
                <span className="text-xs font-mono text-sol-muted">{t.date}</span>
                <StageBadge stage={t.from} />
                <span className="text-sol-muted">→</span>
                <StageBadge stage={t.to} />
                <span className={`text-xs ${stageOrder[t.to] > stageOrder[t.from] ? 'text-sol-green' : 'text-red-400'}`}>
                  {stageOrder[t.to] > stageOrder[t.from] ? 'Advanced' : 'Regressed'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Summary Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-purple">{timeline.points.length}</div>
          <div className="text-xs text-sol-muted">Reports</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-green">{timeline.peakConfidence}%</div>
          <div className="text-xs text-sol-muted">Peak Confidence</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-blue">{timeline.stageTransitions.length}</div>
          <div className="text-xs text-sol-muted">Stage Changes</div>
        </div>
        <div className="border border-sol-border rounded-lg p-4 bg-sol-card text-center">
          <div className="text-2xl font-bold text-sol-orange">
            {timeline.points[timeline.points.length - 1]?.stage ?? '-'}
          </div>
          <div className="text-xs text-sol-muted">Current Stage</div>
        </div>
      </section>
    </div>
  );
}
