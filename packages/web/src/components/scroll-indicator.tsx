'use client';

import { useState, useEffect } from 'react';

export function ScrollIndicator() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setVisible(window.scrollY < 100);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!mounted || !visible) return null;

  return (
    <div className="flex justify-center py-4 animate-bounce">
      <svg className="w-6 h-6 text-sol-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
