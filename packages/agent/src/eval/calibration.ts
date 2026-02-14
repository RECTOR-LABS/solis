import 'dotenv/config';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config.js';
import { matchNarratives } from '../utils/history.js';
import type { FortnightlyReport } from '@solis/shared';

export interface CalibrationBucket {
  range: [number, number];
  total: number;
  persisted: number;
  persistenceRate: number;
  stageAdvanced: number;
  momentumAccuracy: number;
}

export interface CalibrationReport {
  reportCount: number;
  dateRange: { from: string; to: string };
  buckets: CalibrationBucket[];
  overallPersistenceRate: number;
  brierScore: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}\.json$/;

export async function loadAllReports(reportsDir: string): Promise<Array<{ date: string; report: FortnightlyReport }>> {
  const files = await readdir(reportsDir);
  const reportFiles = files
    .filter(f => DATE_PATTERN.test(f))
    .sort();

  const reports: Array<{ date: string; report: FortnightlyReport }> = [];
  for (const file of reportFiles) {
    try {
      const raw = await readFile(join(reportsDir, file), 'utf-8');
      const report = JSON.parse(raw) as FortnightlyReport;
      reports.push({ date: file.replace('.json', ''), report });
    } catch {
      // Skip corrupt files
    }
  }

  return reports;
}

export function computeCalibration(
  reports: Array<{ date: string; report: FortnightlyReport }>,
): CalibrationReport {
  if (reports.length < 2) {
    return {
      reportCount: reports.length,
      dateRange: {
        from: reports[0]?.date ?? '',
        to: reports[reports.length - 1]?.date ?? '',
      },
      buckets: createEmptyBuckets(),
      overallPersistenceRate: 0,
      brierScore: 0,
    };
  }

  const buckets = createEmptyBuckets();
  let totalNarratives = 0;
  let totalPersisted = 0;
  let brierSum = 0;

  // For each consecutive pair, match narratives
  for (let i = 0; i < reports.length - 1; i++) {
    const current = reports[i].report.narratives;
    const next = reports[i + 1].report.narratives;

    // Match next report narratives against current to find which persisted
    const nextMatches = matchNarratives(next, current);
    const persistedSlugs = new Set(
      nextMatches.filter(m => m.previous).map(m => m.previous!.slug),
    );

    for (const narrative of current) {
      const persisted = persistedSlugs.has(narrative.slug);
      const bucket = findBucket(buckets, narrative.confidence);
      if (!bucket) continue;

      bucket.total++;
      totalNarratives++;

      if (persisted) {
        bucket.persisted++;
        totalPersisted++;
      }

      // Brier score: (predicted_probability - actual_outcome)^2
      const predicted = narrative.confidence / 100;
      const actual = persisted ? 1 : 0;
      brierSum += (predicted - actual) ** 2;

      // Check stage advancement
      if (persisted) {
        const nextNarrative = next.find(n =>
          nextMatches.some(m => m.previous?.slug === narrative.slug && m.current.slug === n.slug),
        );
        if (nextNarrative) {
          const advanced = stageOrder(nextNarrative.stage) > stageOrder(narrative.stage);
          if (advanced) bucket.stageAdvanced++;

          // Momentum accuracy: did "accelerating" predict advancement?
          if (narrative.momentum === 'accelerating' && advanced) {
            bucket.momentumAccuracy = (bucket.momentumAccuracy || 0) + 1;
          }
        }
      }
    }
  }

  // Finalize bucket rates
  for (const bucket of buckets) {
    bucket.persistenceRate = bucket.total > 0 ? bucket.persisted / bucket.total : 0;
    // Normalize momentum accuracy to percentage of persisted narratives
    if (bucket.persisted > 0) {
      bucket.momentumAccuracy = bucket.momentumAccuracy / bucket.persisted;
    }
  }

  return {
    reportCount: reports.length,
    dateRange: {
      from: reports[0].date,
      to: reports[reports.length - 1].date,
    },
    buckets,
    overallPersistenceRate: totalNarratives > 0 ? totalPersisted / totalNarratives : 0,
    brierScore: totalNarratives > 0 ? brierSum / totalNarratives : 0,
  };
}

function createEmptyBuckets(): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [];
  for (let low = 0; low < 100; low += 10) {
    buckets.push({
      range: [low, low + 10],
      total: 0,
      persisted: 0,
      persistenceRate: 0,
      stageAdvanced: 0,
      momentumAccuracy: 0,
    });
  }
  return buckets;
}

function findBucket(buckets: CalibrationBucket[], confidence: number): CalibrationBucket | undefined {
  const clamped = Math.max(0, Math.min(99, confidence));
  const index = Math.floor(clamped / 10);
  return buckets[index];
}

const STAGE_ORDER: Record<string, number> = {
  EARLY: 0,
  EMERGING: 1,
  GROWING: 2,
  MAINSTREAM: 3,
};

function stageOrder(stage: string): number {
  return STAGE_ORDER[stage] ?? 0;
}

async function main() {
  console.log('\nSOLIS Confidence Calibration Analysis\n');

  const reports = await loadAllReports(env.REPORTS_DIR);
  if (reports.length < 2) {
    console.log(`Only ${reports.length} report(s) found. Need at least 2 for calibration.`);
    process.exit(0);
  }

  console.log(`Analyzing ${reports.length} reports (${reports[0].date} to ${reports[reports.length - 1].date})\n`);

  const calibration = computeCalibration(reports);

  // Write output
  const evalDir = join(env.REPORTS_DIR, 'eval');
  await mkdir(evalDir, { recursive: true });
  const outPath = join(evalDir, 'calibration.json');
  await writeFile(outPath, JSON.stringify(calibration, null, 2), 'utf-8');

  // Console summary
  console.log('=== Calibration Results ===');
  console.log(`Brier Score: ${calibration.brierScore.toFixed(4)} (lower = better calibrated)`);
  console.log(`Overall Persistence Rate: ${(calibration.overallPersistenceRate * 100).toFixed(1)}%\n`);

  console.log('Confidence Bucket | Count | Persisted | Rate');
  console.log('-'.repeat(50));
  for (const b of calibration.buckets) {
    if (b.total === 0) continue;
    console.log(
      `  ${b.range[0]}-${b.range[1]}%`.padEnd(18) +
      `| ${b.total}`.padEnd(8) +
      `| ${b.persisted}`.padEnd(12) +
      `| ${(b.persistenceRate * 100).toFixed(1)}%`,
    );
  }

  console.log(`\nFull report: ${outPath}`);
}

const isDirectRun = process.argv[1] &&
  (process.argv[1].endsWith('calibration.ts') || process.argv[1].endsWith('calibration.js'));
if (isDirectRun) main();
