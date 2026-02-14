'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { TimelinePoint } from '@/lib/timeline';
import type { SignalStage } from '@solis/shared';

const stageColors: Record<SignalStage, string> = {
  EARLY: '#00d4ff',
  EMERGING: '#facc15',
  GROWING: '#f7931a',
  MAINSTREAM: '#ef4444',
};

interface Props {
  points: TimelinePoint[];
}

export function TimelineChart({ points }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-48 bg-sol-card rounded-lg animate-pulse" />;
  }

  const data = points.map(p => ({
    date: p.date,
    confidence: p.confidence,
    stage: p.stage,
    fill: stageColors[p.stage],
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid stroke="#1e1e2a" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          fontSize={10}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          height={45}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          domain={[0, 100]}
          label={{ value: '%', position: 'insideTopLeft', fill: '#6b7280', fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ background: '#111118', border: '1px solid #1e1e2a', borderRadius: 8, color: '#fff', fontSize: 13 }}
          formatter={(value) => [`${value}%`, 'Confidence']}
        />
        <ReferenceLine y={50} stroke="#1e1e2a" strokeDasharray="3 3" />
        <Line
          type="monotone"
          dataKey="confidence"
          stroke="#9945ff"
          strokeWidth={2}
          dot={{ fill: '#9945ff', r: 4, stroke: '#0a0a0f', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: '#14f195', stroke: '#0a0a0f', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
