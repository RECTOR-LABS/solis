import type { Narrative, FortnightlyReport } from '@solis/shared';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function narrativesToCSV(narratives: Narrative[]): string {
  const headers = ['name', 'stage', 'momentum', 'confidence', 'relatedTokens', 'relatedProtocols', 'isNew'];
  const rows = narratives.map(n => [
    escapeCSV(n.name),
    n.stage,
    n.momentum,
    String(n.confidence),
    escapeCSV(n.relatedTokens.join('; ')),
    escapeCSV(n.relatedProtocols.join('; ')),
    String(n.isNew ?? false),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function reportToJSON(report: FortnightlyReport): string {
  return JSON.stringify(report, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
