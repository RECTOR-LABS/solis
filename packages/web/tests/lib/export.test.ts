import { describe, it, expect } from 'vitest';
import { narrativesToCSV, reportToJSON } from '@/lib/export';
import type { Narrative, FortnightlyReport } from '@solis/shared';

const mockNarrative: Narrative = {
  id: 'n1',
  name: 'DePIN Expansion',
  slug: 'depin-expansion',
  description: 'Growing DePIN ecosystem on Solana',
  stage: 'EMERGING',
  momentum: 'accelerating',
  confidence: 78,
  signals: { leading: ['stars up'], coincident: ['TVL up'], confirming: ['price up'], social: [] },
  relatedRepos: ['helium/gateway-rs'],
  relatedTokens: ['HNT', 'MOBILE'],
  relatedProtocols: ['Helium', 'Hivemapper'],
  isNew: true,
};

const mockNarrativeWithSpecialChars: Narrative = {
  ...mockNarrative,
  id: 'n2',
  name: 'AI, Agents & "Smart" Infra',
  slug: 'ai-agents-smart-infra',
  relatedTokens: ['RNDR'],
  relatedProtocols: ['Render Network'],
  isNew: false,
};

describe('narrativesToCSV', () => {
  it('produces valid CSV with headers', () => {
    const csv = narrativesToCSV([mockNarrative]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('name,stage,momentum,confidence,relatedTokens,relatedProtocols,isNew');
    expect(lines).toHaveLength(2);
  });

  it('correctly formats narrative fields', () => {
    const csv = narrativesToCSV([mockNarrative]);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toContain('DePIN Expansion');
    expect(dataLine).toContain('EMERGING');
    expect(dataLine).toContain('accelerating');
    expect(dataLine).toContain('78');
    expect(dataLine).toContain('HNT; MOBILE');
    expect(dataLine).toContain('Helium; Hivemapper');
    expect(dataLine).toContain('true');
  });

  it('escapes commas and quotes in CSV values', () => {
    const csv = narrativesToCSV([mockNarrativeWithSpecialChars]);
    const dataLine = csv.split('\n')[1];
    // Name with comma and quotes should be escaped
    expect(dataLine).toContain('"AI, Agents & ""Smart"" Infra"');
  });

  it('handles empty array', () => {
    const csv = narrativesToCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // headers only
  });

  it('handles multiple narratives', () => {
    const csv = narrativesToCSV([mockNarrative, mockNarrativeWithSpecialChars]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3); // header + 2 data rows
  });
});

describe('reportToJSON', () => {
  it('produces valid JSON string', () => {
    const report = { version: '1.0', narratives: [mockNarrative] } as unknown as FortnightlyReport;
    const json = reportToJSON(report);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(parsed.narratives).toHaveLength(1);
    expect(parsed.narratives[0].name).toBe('DePIN Expansion');
  });

  it('formats with 2-space indentation', () => {
    const report = { version: '1.0' } as unknown as FortnightlyReport;
    const json = reportToJSON(report);
    expect(json).toContain('  "version"');
  });
});
