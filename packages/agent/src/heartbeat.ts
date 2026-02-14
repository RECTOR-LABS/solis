import 'dotenv/config';
import {
  openSync,
  closeSync,
  writeFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
  constants,
} from 'node:fs';
import { execSync } from 'node:child_process';
import { logger } from './logger.js';
import { runPipeline } from './index.js';

// --- Configuration ---

const LOCK_FILE = '/tmp/solis-heartbeat.lock';
const STATE_FILE = '.solis-state.json';
const HEARTBEAT_HOUR = parseInt(process.env.HEARTBEAT_HOUR || '8', 10);
const GIT_PUSH_ENABLED = process.env.GIT_PUSH_ENABLED !== 'false';

// --- State ---

interface SolisState {
  lastRunTime: number;
  lastRunDate: string;
  consecutiveFailures: number;
  cycleCount: number;
  totalReports: number;
}

const DEFAULT_STATE: SolisState = {
  lastRunTime: 0,
  lastRunDate: '',
  consecutiveFailures: 0,
  cycleCount: 0,
  totalReports: 0,
};

function loadState(): SolisState {
  try {
    const raw = readFileSync(STATE_FILE, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(state: SolisState): void {
  const tempFile = `${STATE_FILE}.tmp.${process.pid}`;
  try {
    writeFileSync(tempFile, JSON.stringify(state, null, 2));
    renameSync(tempFile, STATE_FILE);
  } catch (err) {
    try { unlinkSync(tempFile); } catch { /* ignore */ }
    throw err;
  }
}

// --- Lock file ---

function acquireLock(): boolean {
  try {
    const fd = openSync(LOCK_FILE, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;

    // Check for stale lock
    try {
      const pid = parseInt(readFileSync(LOCK_FILE, 'utf-8').trim(), 10);
      process.kill(pid, 0); // Throws if process doesn't exist
      return false; // Process alive — genuine lock
    } catch {
      // Stale lock — remove and retry
      logger.warn('Removing stale lock file');
      try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
      try {
        const fd = openSync(LOCK_FILE, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
        writeFileSync(fd, String(process.pid));
        closeSync(fd);
        return true;
      } catch {
        return false;
      }
    }
  }
}

function releaseLock(): void {
  try { unlinkSync(LOCK_FILE); } catch { /* ignore */ }
}

// --- Scheduling ---

function msUntilNextRun(): number {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(HEARTBEAT_HOUR, 0, 0, 0);

  if (now.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.getTime() - now.getTime();
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

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
  if (!acquireLock()) {
    logger.error('Another instance is running. Exiting to prevent duplicate runs.');
    process.exit(1);
  }

  const daemonStart = Date.now();
  const state = loadState();
  let stopping = false;
  const ac = new AbortController();

  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    ac.abort();
    releaseLock();
    logger.info({
      cycleCount: state.cycleCount,
      totalReports: state.totalReports,
      uptime: formatUptime(daemonStart),
    }, 'Heartbeat stopping — graceful shutdown');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', releaseLock);

  logger.info({
    targetHourUTC: HEARTBEAT_HOUR,
    gitPushEnabled: GIT_PUSH_ENABLED,
    lastRunDate: state.lastRunDate || 'never',
    totalReports: state.totalReports,
    pid: process.pid,
  }, 'SOLIS heartbeat daemon started');

  while (!stopping) {
    const sleepMs = msUntilNextRun();
    logger.info({ nextRunIn: formatDuration(sleepMs) }, `Sleeping until ${HEARTBEAT_HOUR}:00 UTC`);

    await sleep(sleepMs, ac.signal);
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
      await runPipeline();
      commitAndPushReports(today);

      state.lastRunTime = Date.now();
      state.lastRunDate = today;
      state.consecutiveFailures = 0;
      state.totalReports++;
      saveState(state);

      logger.info({
        date: today,
        totalReports: state.totalReports,
        uptime: formatUptime(daemonStart),
      }, 'Pipeline cycle complete');
    } catch (err) {
      state.consecutiveFailures++;
      saveState(state);

      logger.error({
        consecutiveFailures: state.consecutiveFailures,
        err: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      }, 'Pipeline cycle failed');

      // Send failure alert (best-effort)
      try {
        const { sendFailureAlert } = await import('./output/alerts.js');
        await sendFailureAlert(err instanceof Error ? err.message : String(err));
      } catch { /* alert failure is non-fatal */ }
    }

    state.cycleCount++;
    saveState(state);
  }
}

heartbeat();
