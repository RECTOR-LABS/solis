'use client';

import { useState, useEffect, useRef } from 'react';

const sections = [
  { id: 'summary', label: 'Summary' },
  { id: 'changes', label: 'Changes', requiresDiff: true },
  { id: 'narratives', label: 'Narratives' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'sources', label: 'Sources' },
];

export function ReportNav({ hasDiff }: { hasDiff: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState('summary');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );

    const visibleSections = sections.filter(s => !s.requiresDiff || hasDiff);
    for (const section of visibleSections) {
      const el = document.getElementById(section.id);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [mounted, hasDiff]);

  if (!mounted) return null;

  const visibleSections = sections.filter(s => !s.requiresDiff || hasDiff);

  return (
    <nav className="-mx-4 px-4 sticky top-0 z-20 backdrop-blur-md bg-sol-darker/80 border-b border-white/[0.06] py-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {visibleSections.map(section => (
          <button
            key={section.id}
            onClick={() => {
              document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer ${
              activeId === section.id
                ? 'bg-white/10 text-white'
                : 'text-sol-muted hover:text-white'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
