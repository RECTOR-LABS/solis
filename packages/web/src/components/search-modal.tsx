'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StageBadge } from './stage-badge';
import type { SearchableNarrative } from '@/lib/search';
import { searchNarratives } from '@/lib/search';

export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<SearchableNarrative[]>([]);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const results = query.trim() ? searchNarratives(items, query) : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && !loaded) {
      fetch('/api/search')
        .then(r => r.json())
        .then((data: SearchableNarrative[]) => {
          setItems(data);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, loaded]);

  const handleInput = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(value), 150);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-sol-dark border border-sol-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-sol-border">
          <svg className="w-4 h-4 text-sol-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search narratives..."
            className="flex-1 bg-transparent text-white placeholder-sol-muted outline-none text-sm"
            onChange={e => handleInput(e.target.value)}
          />
          <kbd className="text-xs text-sol-muted bg-sol-card px-1.5 py-0.5 rounded border border-sol-border">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sol-muted text-sm">
              No narratives match &ldquo;{query}&rdquo;
            </div>
          )}
          {results.slice(0, 10).map(({ date, narrative }) => (
            <a
              key={`${date}-${narrative.id}`}
              href={`/report/${date}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-sol-card transition-colors border-b border-sol-border/50 last:border-b-0"
              onClick={() => setOpen(false)}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">{narrative.name}</span>
                  {narrative.isNew && (
                    <span className="text-[10px] px-1 py-0.5 bg-sol-green/10 text-sol-green rounded border border-sol-green/30">
                      New
                    </span>
                  )}
                </div>
                <span className="text-xs text-sol-muted">{date}</span>
              </div>
              <div className="shrink-0 ml-3">
                <StageBadge stage={narrative.stage} />
              </div>
            </a>
          ))}
          {!query.trim() && (
            <div className="px-4 py-8 text-center text-sol-muted text-sm">
              Type to search across all narratives, tokens, protocols, and repos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
