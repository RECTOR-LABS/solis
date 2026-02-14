import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { FortnightlyReport, ReportSummary } from '@solis/shared';

const REPORTS_DIR = process.env.REPORTS_DIR || join(process.cwd(), '../../reports');

export async function getReport(date: string): Promise<FortnightlyReport | null> {
  try {
    const content = await readFile(join(REPORTS_DIR, `${date}.json`), 'utf-8');
    return JSON.parse(content) as FortnightlyReport;
  } catch {
    return null;
  }
}

export async function getLatestReport(): Promise<FortnightlyReport | null> {
  const dates = await getReportDates();
  if (dates.length === 0) return null;
  return getReport(dates[0]);
}

export async function getReportDates(): Promise<string[]> {
  try {
    const files = await readdir(REPORTS_DIR);
    return files
      .filter(f => f.endsWith('.json') && !f.includes('/'))
      .map(f => f.replace('.json', ''))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a)); // newest first
  } catch {
    return [];
  }
}

export async function getAllNarrativesFlat(): Promise<Array<{ date: string; narrative: import('@solis/shared').Narrative }>> {
  const dates = await getReportDates();
  const result: Array<{ date: string; narrative: import('@solis/shared').Narrative }> = [];

  for (const date of dates) {
    const report = await getReport(date);
    if (!report) continue;
    for (const narrative of report.narratives) {
      result.push({ date, narrative });
    }
  }

  return result;
}

export async function getAllReports(): Promise<Array<{ date: string; report: FortnightlyReport }>> {
  const dates = await getReportDates();
  const result: Array<{ date: string; report: FortnightlyReport }> = [];

  for (const date of dates) {
    const report = await getReport(date);
    if (report) result.push({ date, report });
  }

  return result;
}

export async function getReportSummaries(): Promise<ReportSummary[]> {
  const dates = await getReportDates();
  const summaries: ReportSummary[] = [];

  for (const date of dates) {
    const report = await getReport(date);
    if (!report) continue;

    summaries.push({
      date,
      generatedAt: report.generatedAt,
      period: report.period,
      narrativeCount: report.narratives.length,
      topNarratives: report.narratives.slice(0, 3).map(n => ({
        name: n.name,
        stage: n.stage,
        momentum: n.momentum,
      })),
      buildIdeaCount: report.buildIdeas.length,
    });
  }

  return summaries;
}
