'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Narrative } from '@solis/shared';

const BUCKETS = [
  { range: '0-20', min: 0, max: 20, color: '#6b7280' },
  { range: '21-40', min: 21, max: 40, color: '#00d4ff' },
  { range: '41-60', min: 41, max: 60, color: '#9945ff' },
  { range: '61-80', min: 61, max: 80, color: '#14f195' },
  { range: '81-100', min: 81, max: 100, color: '#f7931a' },
];

interface Props {
  narratives: Narrative[];
}

export function ConfidenceChart({ narratives }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = BUCKETS.map(bucket => ({
    range: bucket.range,
    count: narratives.filter(n => n.confidence >= bucket.min && n.confidence <= bucket.max).length,
    fill: bucket.color,
  }));

  if (!mounted) {
    return <div className="h-64 bg-sol-card rounded-lg animate-pulse" />;
  }

  return (
    <div className="border border-sol-border rounded-lg bg-sol-card p-4">
      <h3 className="text-sm font-semibold mb-4 text-sol-muted">Confidence Distribution</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#1e1e2a" strokeDasharray="3 3" />
          <XAxis
            dataKey="range"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            label={{ value: 'Confidence %', position: 'insideBottom', offset: -2, fill: '#6b7280', fontSize: 11 }}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            allowDecimals={false}
            label={{ value: 'Narratives', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{ background: '#111118', border: '1px solid #1e1e2a', borderRadius: 8, color: '#fff', fontSize: 13 }}
            cursor={{ fill: 'rgba(153, 69, 255, 0.1)' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#9945ff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
