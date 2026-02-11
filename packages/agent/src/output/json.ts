import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { FortnightlyReport } from '@solis/shared';

export async function writeJsonReport(report: FortnightlyReport, date: string): Promise<string> {
  const dir = env.REPORTS_DIR;
  await mkdir(dir, { recursive: true });

  const reportPath = join(dir, `${date}.json`);
  const signalsPath = join(dir, 'signals', `${date}.json`);

  await mkdir(join(dir, 'signals'), { recursive: true });

  // Write full report
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  logger.info({ path: reportPath }, 'JSON report written');

  // Write signals-only extract (lighter payload for API)
  const signalsOnly = {
    date,
    period: report.period,
    signals: report.signals,
    meta: {
      generatedAt: report.generatedAt,
      sources: report.sources,
    },
  };
  await writeFile(signalsPath, JSON.stringify(signalsOnly, null, 2), 'utf-8');
  logger.info({ path: signalsPath }, 'Signals JSON written');

  return reportPath;
}
