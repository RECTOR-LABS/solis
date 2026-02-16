import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, openSync, closeSync, constants } from 'node:fs';
import { tmpdir } from 'node:os';

vi.mock('../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import {
  loadState,
  saveState,
  acquireLock,
  releaseLock,
  msUntilNextRun,
  formatDuration,
  DEFAULT_STATE,
} from '../src/heartbeat-utils.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'solis-hb-test-'));
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadState', () => {
  it('returns default state when file does not exist', () => {
    const state = loadState(join(tmpDir, 'nonexistent.json'));
    expect(state).toEqual(DEFAULT_STATE);
  });

  it('parses saved state and merges with defaults', () => {
    const stateFile = join(tmpDir, 'state.json');
    saveState({ ...DEFAULT_STATE, totalReports: 42, lastRunDate: '2026-02-14' }, stateFile);
    const state = loadState(stateFile);
    expect(state.totalReports).toBe(42);
    expect(state.lastRunDate).toBe('2026-02-14');
    expect(state.consecutiveFailures).toBe(0);
  });
});

describe('saveState', () => {
  it('writes state to file and can round-trip', () => {
    const stateFile = join(tmpDir, 'state.json');
    const state = { ...DEFAULT_STATE, cycleCount: 10, totalReports: 5 };
    saveState(state, stateFile);

    const raw = readFileSync(stateFile, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.cycleCount).toBe(10);
    expect(parsed.totalReports).toBe(5);

    const loaded = loadState(stateFile);
    expect(loaded).toEqual(state);
  });
});

describe('acquireLock / releaseLock', () => {
  it('acquires lock successfully', () => {
    const lockFile = join(tmpDir, 'test.lock');
    const result = acquireLock(lockFile);
    expect(result).toBe(true);
    expect(existsSync(lockFile)).toBe(true);

    const content = readFileSync(lockFile, 'utf-8');
    expect(content).toBe(String(process.pid));

    releaseLock(lockFile);
    expect(existsSync(lockFile)).toBe(false);
  });

  it('fails when lock exists for current process', () => {
    const lockFile = join(tmpDir, 'test.lock');
    acquireLock(lockFile);

    // Second acquire should fail since our own PID is alive
    const result = acquireLock(lockFile);
    expect(result).toBe(false);

    releaseLock(lockFile);
  });

  it('recovers stale lock from dead PID', () => {
    const lockFile = join(tmpDir, 'test.lock');
    // Write a lock with a definitely-dead PID
    const fd = openSync(lockFile, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
    writeFileSync(fd, '999999');
    closeSync(fd);

    // acquireLock should detect stale and recover
    const result = acquireLock(lockFile);
    expect(result).toBe(true);

    releaseLock(lockFile);
  });

  it('releaseLock is safe to call when no lock exists', () => {
    const lockFile = join(tmpDir, 'nonexistent.lock');
    expect(() => releaseLock(lockFile)).not.toThrow();
  });
});

describe('msUntilNextRun', () => {
  it('returns positive value', () => {
    const ms = msUntilNextRun(8);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('returns roughly 24h when just past target hour', () => {
    const now = new Date();
    const justPastHour = now.getUTCHours();
    const ms = msUntilNextRun(justPastHour);
    // Should be close to 24h (minus a few ms for execution time)
    expect(ms).toBeGreaterThan(23 * 60 * 60 * 1000);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(3_600_000)).toBe('1h 0m');
    expect(formatDuration(5_400_000)).toBe('1h 30m');
    expect(formatDuration(0)).toBe('0h 0m');
    expect(formatDuration(7_200_000 + 900_000)).toBe('2h 15m');
  });
});
