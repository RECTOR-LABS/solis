import type { Narrative, FortnightlyReport, SignalStage } from '@solis/shared';
import { NarrativeCard } from './narrative-card';
import { extractEvidence } from '@/lib/evidence';

const stageConfig: Record<SignalStage, { label: string; color: string; bg: string; border: string }> = {
  EARLY: { label: 'Early', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  EMERGING: { label: 'Emerging', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
  GROWING: { label: 'Growing', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  MAINSTREAM: { label: 'Mainstream', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
};

interface NarrativeStageGroupProps {
  narratives: Narrative[];
  signals: FortnightlyReport['signals'];
  stage: SignalStage;
}

export function NarrativeStageGroup({ narratives, signals, stage }: NarrativeStageGroupProps) {
  if (narratives.length === 0) return null;

  const config = stageConfig[stage];
  const sorted = [...narratives].sort((a, b) => b.confidence - a.confidence);

  return (
    <div>
      {/* Stage banner */}
      <div className={`flex items-center gap-3 ${config.bg} ${config.border} border rounded-lg px-4 py-2.5 mb-4`}>
        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
          {narratives.length}
        </span>
      </div>

      {/* Narrative cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map(narrative => (
          <NarrativeCard
            key={narrative.id}
            narrative={narrative}
            evidence={extractEvidence(narrative, signals)}
          />
        ))}
      </div>
    </div>
  );
}
