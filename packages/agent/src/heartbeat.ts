import 'dotenv/config';
import { execSync } from 'node:child_process';
import { logger } from './logger.js';
import { runPipeline } from './index.js';
import {
  loadState,
  saveState,
  acquireLock,
  releaseLock,
  msUntilNextRun,
  formatDuration,
} from './heartbeat-utils.js';

// --- Configuration ---

const LOCK_FILE = process.env.HEARTBEAT_LOCK_PATH || '/tmp/solis-heartbeat.lock';
const STATE_FILE = '.solis-state.json';
const HEARTBEAT_HOUR = parseInt(process.env.HEARTBEAT_HOUR || '8', 10);
const GIT_PUSH_ENABLED = process.env.GIT_PUSH_ENABLED !== 'false';
const RETRY_DELAY_MS = 30 * 60_000; // 30 minutes
const MAX_RETRIES_PER_DAY = 2;

function formatUptime(startTime: number): string {
  return formatDuration(Date.now() - startTime);
}

// --- Git operations ---

function commitAndPushReports(date: string): void {
  execSync('git add reports/', { stdio: 'pipe' });

  // Check if there are staged changes
  try {
    execSync('git diff --cached --quiet', { stdio: 'pipe' });
    logger.info('No report changes to commit');
    return;
  } catch {
    // Non-zero exit = there ARE changes to commit
  }

  execSync(`git commit -m "report: ${date} daily intelligence"`, { stdio: 'pipe' });
  logger.info({ date }, 'Report committed');

  if (GIT_PUSH_ENABLED) {
    execSync('git push', { stdio: 'pipe' });
    logger.info('Report pushed to remote');
  }
}

// --- Sleep with abort ---

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>(resolve => {
    if (signal.aborted) { resolve(); return; }
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
}

// --- Main heartbeat loop ---

async function heartbeat(): Promise<void> {
  if (!acquireLock(LOCK_FILE)) {
    logger.error('Another instance is running. Exiting to prevent duplicate runs.');
    process.exit(1);
  }

  const daemonStart = Date.now();
  const state = loadState(STATE_FILE);
  let stopping = false;
  const ac = new AbortController();

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    ac.abort();
    releaseLock(LOCK_FILE);
    logger.info({
      cycleCount: state.cycleCount,
      totalReports: state.totalReports,
      uptime: formatUptime(daemonStart),
    }, 'Heartbeat stopping — graceful shutdown');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', () => releaseLock(LOCK_FILE));

  logger.info({
    targetHourUTC: HEARTBEAT_HOUR,
    gitPushEnabled: GIT_PUSH_ENABLED,
    lastRunDate: state.lastRunDate || 'never',
    totalReports: state.totalReports,
    pid: process.pid,
  }, 'SOLIS heartbeat daemon started');

  let retryAt: number | null = null;

  while (!stopping) {
    // Sleep until next scheduled run or retry
    if (retryAt) {
      const waitMs = Math.max(0, retryAt - Date.now());
      logger.info({ retryIn: formatDuration(waitMs) }, 'Sleeping until scheduled retry');
      await sleep(waitMs, ac.signal);
      retryAt = null;
    } else {
      const sleepMs = msUntilNextRun(HEARTBEAT_HOUR);
      logger.info({ nextRunIn: formatDuration(sleepMs) }, `Sleeping until ${HEARTBEAT_HOUR}:00 UTC`);
      await sleep(sleepMs, ac.signal);
    }
    if (stopping) break;

    // Duplicate run protection (restart safety)
    const today = new Date().toISOString().split('T')[0];
    if (state.lastRunDate === today) {
      logger.info({ date: today }, 'Already ran today, skipping');
      // Sleep 1 minute to avoid tight loop at boundary
      await sleep(60_000, ac.signal);
      continue;
    }

    logger.info({ cycle: state.cycleCount + 1, date: today }, 'Starting pipeline cycle');

    try {
      const result = await runPipeline();

      // Empty report safety net: data was collected but LLM produced nothing.
      // Don't commit empty reports — schedule a retry instead.
      if (result.narratives === 0 && result.anomalies > 0 && state.consecutiveFailures < MAX_RETRIES_PER_DAY) {
        state.consecutiveFailures++;
        state.cycleCount++;
        saveState(state, STATE_FILE);

        logger.warn({
          anomalies: result.anomalies,
          attempt: state.consecutiveFailures,
          maxRetries: MAX_RETRIES_PER_DAY,
          retryIn: formatDuration(RETRY_DELAY_MS),
        }, 'Empty report despite anomalies — scheduling retry');

        retryAt = Date.now() + RETRY_DELAY_MS;
        continue;
      }

      commitAndPushReports(today);

      state.lastRunTime = Date.now();
      state.lastRunDate = today;
      state.consecutiveFailures = 0;
      state.totalReports++;
    } catch (err) {
      state.consecutiveFailures++;

      logger.error({
        consecutiveFailures: state.consecutiveFailures,
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      }, 'Pipeline cycle failed');

      // Send failure alert (best-effort)
      try {
        const { sendFailureAlert } = await import('./output/alerts.js');
        await sendFailureAlert(err instanceof Error ? err.message : String(err));
      } catch { /* alert failure is non-fatal */ }

      // Retry after delay instead of waiting 24h
      if (state.consecutiveFailures <= MAX_RETRIES_PER_DAY) {
        logger.warn({
          retryIn: formatDuration(RETRY_DELAY_MS),
          attempt: state.consecutiveFailures,
        }, 'Scheduling retry after failure');
        retryAt = Date.now() + RETRY_DELAY_MS;
      }
    }

    state.cycleCount++;
    saveState(state, STATE_FILE);
  }
}

heartbeat();
