'use client';

import { useState, useEffect } from 'react';
import { msUntilNextReport, msToHMS } from '@/lib/temporal';

export function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [ms, setMs] = useState(() => msUntilNextReport());

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setMs(msUntilNextReport()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    return <span className="text-sol-muted text-sm font-mono">Next report in --h --m --s</span>;
  }

  const { hours, minutes, seconds } = msToHMS(ms);
  const isImminent = hours === 0;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <span
      className={`text-sm font-mono tabular-nums inline-flex items-center gap-1.5 ${
        isImminent ? 'text-sol-green' : 'text-sol-muted'
      }`}
    >
      {isImminent && (
        <span className="inline-block w-2 h-2 rounded-full bg-sol-green animate-glow-pulse" />
      )}
      Next report in {pad(hours)}h {pad(minutes)}m {pad(seconds)}s
    </span>
  );
}
