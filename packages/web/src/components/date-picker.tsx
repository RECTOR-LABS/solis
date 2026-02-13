'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function DatePicker({ dates }: { dates: string[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function toggle(date: string) {
    setSelected(prev => {
      if (prev.includes(date)) return prev.filter(d => d !== date);
      if (prev.length >= 2) return [prev[1], date];
      return [...prev, date];
    });
  }

  function compare() {
    if (selected.length !== 2) return;
    const sorted = [...selected].sort();
    router.push(`/compare?dates=${sorted[0]},${sorted[1]}`);
  }

  return (
    <div className="space-y-4">
      <p className="text-sol-muted text-sm">Select two reports to compare.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {dates.map(date => {
          const isSelected = selected.includes(date);
          const order = isSelected ? selected.indexOf(date) + 1 : null;
          return (
            <button
              key={date}
              onClick={() => toggle(date)}
              className={`
                border rounded-lg p-3 text-left transition-all cursor-pointer
                ${isSelected
                  ? 'border-sol-green bg-sol-green/10 ring-1 ring-sol-green'
                  : 'border-sol-border bg-sol-card hover:border-sol-muted'}
              `}
            >
              <span className="font-mono text-sm text-white">{date}</span>
              {order && (
                <span className="ml-2 text-xs text-sol-green font-medium">
                  {order === 1 ? 'FROM' : 'TO'}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        onClick={compare}
        disabled={selected.length !== 2}
        className={`
          w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium text-sm transition-all
          ${selected.length === 2
            ? 'bg-sol-green text-black hover:bg-sol-green/90 cursor-pointer'
            : 'bg-sol-card text-sol-muted border border-sol-border cursor-not-allowed'}
        `}
      >
        {selected.length === 2
          ? `Compare ${selected[0]} vs ${selected[1]}`
          : `Select ${2 - selected.length} more report${selected.length === 1 ? '' : 's'}`}
      </button>
    </div>
  );
}
