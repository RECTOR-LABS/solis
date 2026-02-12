'use client';

import { useState, useEffect } from 'react';
import { relativeLabel, freshness, formatExact, type Freshness } from '@/lib/temporal';

const dotColor: Record<Freshness, string> = {
  fresh: 'bg-sol-green',
  recent: 'bg-yellow-400',
  stale: 'bg-sol-muted',
};

export function ReportTimestamp({
  generatedAt,
  className = '',
}: {
  generatedAt: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [showExact, setShowExact] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className={`text-sm text-sol-muted ${className}`}>Loading...</span>;
  }

  const fresh = freshness(generatedAt);
  const label = showExact ? formatExact(generatedAt) : relativeLabel(generatedAt);

  return (
    <button
      type="button"
      onClick={() => setShowExact(prev => !prev)}
      className={`inline-flex items-center gap-1.5 text-sm text-sol-muted hover:text-white transition-colors ${className}`}
      title={showExact ? relativeLabel(generatedAt) : formatExact(generatedAt)}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${dotColor[fresh]}`} />
      {label}
    </button>
  );
}
