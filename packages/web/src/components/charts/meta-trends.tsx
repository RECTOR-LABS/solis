'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface MetaPoint {
  date: string;
  narratives: number;
  anomalies: number;
  llmCost: number;
}

interface Props {
  data: MetaPoint[];
}

export function MetaTrendsChart({ data }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-80 bg-sol-card rounded-lg animate-pulse" />;
  }

  return (
    <div className="border border-sol-border rounded-lg bg-sol-card p-4">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#1e1e2a" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            tickFormatter={(v: number) => `$${v.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{ background: '#111118', border: '1px solid #1e1e2a', borderRadius: 8, color: '#fff', fontSize: 13 }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === 'LLM Cost') return [`$${v.toFixed(3)}`, name];
              return [v, name];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#6b7280' }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="narratives"
            name="Narratives"
            stroke="#9945ff"
            strokeWidth={2}
            dot={{ fill: '#9945ff', r: 3 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="anomalies"
            name="Anomalies"
            stroke="#f7931a"
            strokeWidth={2}
            dot={{ fill: '#f7931a', r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="llmCost"
            name="LLM Cost"
            stroke="#14f195"
            strokeWidth={2}
            dot={{ fill: '#14f195', r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
