import type { SignalStage } from '@solis/shared';

const stageConfig: Record<SignalStage, { label: string; color: string; bg: string }> = {
  EARLY: { label: 'Early', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  EMERGING: { label: 'Emerging', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  GROWING: { label: 'Growing', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30' },
  MAINSTREAM: { label: 'Mainstream', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
};

export function StageBadge({ stage }: { stage: SignalStage }) {
  const config = stageConfig[stage];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}
