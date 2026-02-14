'use client';

import { useState, useEffect } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { Narrative } from '@solis/shared';

interface Props {
  narrative: Narrative;
}

export function SignalRadar({ narrative }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = [
    { layer: 'Leading', count: narrative.signals.leading.length, fullMark: 10 },
    { layer: 'Coincident', count: narrative.signals.coincident.length, fullMark: 10 },
    { layer: 'Confirming', count: narrative.signals.confirming.length, fullMark: 10 },
    { layer: 'Social', count: narrative.signals.social.length, fullMark: 10 },
  ];

  if (!mounted) {
    return <div className="h-40 w-40 bg-sol-card rounded-lg animate-pulse" />;
  }

  return (
    <div className="w-full max-w-[200px]">
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#1e1e2a" />
          <PolarAngleAxis
            dataKey="layer"
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ background: '#111118', border: '1px solid #1e1e2a', borderRadius: 8, color: '#fff', fontSize: 12 }}
          />
          <Radar
            dataKey="count"
            stroke="#9945ff"
            fill="#9945ff"
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
