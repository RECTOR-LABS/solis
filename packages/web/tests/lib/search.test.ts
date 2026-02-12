import { describe, it, expect } from 'vitest';
import { searchNarratives, type SearchableNarrative } from '@/lib/search';
import type { Narrative } from '@solis/shared';

const base: Narrative = {
  id: 'n1',
  name: 'DePIN Expansion',
  slug: 'depin-expansion',
  description: 'Growing DePIN ecosystem',
  stage: 'EMERGING',
  momentum: 'accelerating',
  confidence: 78,
  signals: { leading: [], coincident: [], confirming: [] },
  relatedRepos: ['helium/gateway-rs'],
  relatedTokens: ['HNT', 'MOBILE'],
  relatedProtocols: ['Helium'],
};

const items: SearchableNarrative[] = [
  { date: '2026-02-12', narrative: base },
  {
    date: '2026-02-12',
    narrative: {
      ...base,
      id: 'n2',
      name: 'Solana AI Agents',
      slug: 'solana-ai-agents',
      description: 'Autonomous agents powered by Solana',
      relatedTokens: ['RNDR'],
      relatedProtocols: ['Render'],
      relatedRepos: ['ai16z/eliza'],
    },
  },
];

describe('searchNarratives', () => {
  it('matches by narrative name', () => {
    const results = searchNarratives(items, 'DePIN');
    expect(results).toHaveLength(1);
    expect(results[0].narrative.name).toBe('DePIN Expansion');
  });

  it('matches by description', () => {
    const results = searchNarratives(items, 'autonomous');
    expect(results).toHaveLength(1);
    expect(results[0].narrative.name).toBe('Solana AI Agents');
  });

  it('matches by related token', () => {
    const results = searchNarratives(items, 'RNDR');
    expect(results).toHaveLength(1);
    expect(results[0].narrative.name).toBe('Solana AI Agents');
  });

  it('matches by related protocol', () => {
    const results = searchNarratives(items, 'Helium');
    expect(results).toHaveLength(1);
    expect(results[0].narrative.name).toBe('DePIN Expansion');
  });

  it('matches by related repo', () => {
    const results = searchNarratives(items, 'eliza');
    expect(results).toHaveLength(1);
    expect(results[0].narrative.name).toBe('Solana AI Agents');
  });

  it('is case insensitive', () => {
    const results = searchNarratives(items, 'depin');
    expect(results).toHaveLength(1);
  });

  it('returns empty array for empty query', () => {
    expect(searchNarratives(items, '')).toHaveLength(0);
    expect(searchNarratives(items, '   ')).toHaveLength(0);
  });

  it('returns empty array for no matches', () => {
    expect(searchNarratives(items, 'zzzzzzz')).toHaveLength(0);
  });

  it('matches multiple items', () => {
    const results = searchNarratives(items, 'Solana');
    expect(results).toHaveLength(1); // only 'Solana AI Agents' has Solana in name/desc
  });
});
