import {
  openSync,
  closeSync,
  writeFileSync,
  readFileSync,
  renameSync,
  unlinkSync,
  constants,
} from 'node:fs';
import { logger } from './logger.js';

// --- State ---

export interface SolisState {
  lastRunTime: number;
  lastRunDate: string;
  consecutiveFailures: number;
  cycleCount: number;
  totalReports: number;
}

export const DEFAULT_STATE: SolisState = {
  lastRunTime: 0,
  lastRunDate: '',
  consecutiveFailures: 0,
  cycleCount: 0,
  totalReports: 0,
};

export function loadState(stateFile: string): SolisState {
  try {
    const raw = readFileSync(stateFile, 'utf-8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: SolisState, stateFile: string): void {
  const tempFile = `${stateFile}.tmp.${process.pid}`;
  try {
    writeFileSync(tempFile, JSON.stringify(state, null, 2));
    renameSync(tempFile, stateFile);
  } catch (err) {
    try { unlinkSync(tempFile); } catch { /* ignore */ }
    throw err;
  }
}

// --- Lock file ---

export function acquireLock(lockFile: string): boolean {
  try {
    const fd = openSync(lockFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;

    // Check for stale lock
    try {
      const pid = parseInt(readFileSync(lockFile, 'utf-8').trim(), 10);
      process.kill(pid, 0); // Throws if process doesn't exist
      return false; // Process alive — genuine lock
    } catch {
      // Stale lock — remove and retry
      logger.warn('Removing stale lock file');
      try { unlinkSync(lockFile); } catch { /* ignore */ }
      try {
        const fd = openSync(lockFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
        writeFileSync(fd, String(process.pid));
        closeSync(fd);
        return true;
      } catch {
        return false;
      }
    }
  }
}

export function releaseLock(lockFile: string): void {
  try { unlinkSync(lockFile); } catch { /* ignore */ }
}

// --- Scheduling ---

export function msUntilNextRun(heartbeatHour: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(heartbeatHour, 0, 0, 0);

  if (now.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.getTime() - now.getTime();
}

export function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}
