import type { MomentumDirection } from '@solis/shared';

const momentumConfig: Record<MomentumDirection, { arrow: string; color: string; label: string }> = {
  accelerating: { arrow: '↑', color: 'text-green-400', label: 'Accelerating' },
  stable: { arrow: '→', color: 'text-sol-muted', label: 'Stable' },
  decelerating: { arrow: '↓', color: 'text-red-400', label: 'Decelerating' },
};

export function MomentumGauge({ momentum }: { momentum: MomentumDirection }) {
  const config = momentumConfig[momentum];
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${config.color}`}>
      <span className="text-base">{config.arrow}</span>
      {config.label}
    </span>
  );
}
