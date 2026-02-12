import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config.js';
import { logger } from '../logger.js';
import type { FortnightlyReport } from '@solis/shared';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}\.json$/;

/**
 * Load the most recent previous report from the reports directory.
 * Returns null on first run (no previous report) or if all reads fail.
 *
 * @param excludeDate - ISO date string (YYYY-MM-DD) to skip (prevents reading today's report on re-runs)
 */
export async function loadPreviousReport(
  excludeDate?: string,
): Promise<FortnightlyReport | null> {
  const log = logger.child({ component: 'reports' });

  try {
    const files = await readdir(env.REPORTS_DIR);
    const reportFiles = files
      .filter(f => DATE_PATTERN.test(f))
      .filter(f => !excludeDate || f !== `${excludeDate}.json`)
      .sort()
      .reverse();

    if (reportFiles.length === 0) {
      log.info('No previous report found — first run');
      return null;
    }

    const newest = reportFiles[0];
    const filePath = join(env.REPORTS_DIR, newest);
    const raw = await readFile(filePath, 'utf-8');
    const report = JSON.parse(raw) as FortnightlyReport;

    log.info({ file: newest }, 'Loaded previous report');
    return report;
  } catch (err) {
    log.warn({ error: err instanceof Error ? err.message : err }, 'Failed to load previous report — treating as first run');
    return null;
  }
}
