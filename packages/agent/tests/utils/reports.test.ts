import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  env: {
    REPORTS_DIR: '/fake/reports',
    LOG_LEVEL: 'error',
    isDevelopment: false,
  },
}));

vi.mock('../../src/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const mockReaddir = vi.fn();
const mockReadFile = vi.fn();
vi.mock('node:fs/promises', () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

describe('loadPreviousReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when reports dir is empty', async () => {
    mockReaddir.mockResolvedValue([]);
    const { loadPreviousReport } = await import('../../src/utils/reports.js');
    const result = await loadPreviousReport();
    expect(result).toBeNull();
  });

  it('should read the newest report file', async () => {
    const fakeReport = { version: '1.0', generatedAt: '2026-01-15T00:00:00Z' };
    mockReaddir.mockResolvedValue(['2026-01-01.json', '2026-01-15.json', '2026-01-08.json']);
    mockReadFile.mockResolvedValue(JSON.stringify(fakeReport));

    const { loadPreviousReport } = await import('../../src/utils/reports.js');
    const result = await loadPreviousReport();

    expect(result).toEqual(fakeReport);
    expect(mockReadFile).toHaveBeenCalledWith('/fake/reports/2026-01-15.json', 'utf-8');
  });

  it('should exclude the specified date', async () => {
    const fakeReport = { version: '1.0', generatedAt: '2026-01-08T00:00:00Z' };
    mockReaddir.mockResolvedValue(['2026-01-08.json', '2026-01-15.json']);
    mockReadFile.mockResolvedValue(JSON.stringify(fakeReport));

    const { loadPreviousReport } = await import('../../src/utils/reports.js');
    const result = await loadPreviousReport('2026-01-15');

    expect(result).toEqual(fakeReport);
    expect(mockReadFile).toHaveBeenCalledWith('/fake/reports/2026-01-08.json', 'utf-8');
  });

  it('should return null when all files are excluded', async () => {
    mockReaddir.mockResolvedValue(['2026-01-15.json']);

    const { loadPreviousReport } = await import('../../src/utils/reports.js');
    const result = await loadPreviousReport('2026-01-15');

    expect(result).toBeNull();
  });

  it('should ignore non-report files', async () => {
    const fakeReport = { version: '1.0' };
    mockReaddir.mockResolvedValue(['README.md', '.gitkeep', '2026-01-15.json', 'notes.txt']);
    mockReadFile.mockResolvedValue(JSON.stringify(fakeReport));

    const { loadPreviousReport } = await import('../../src/utils/reports.js');
    const result = await loadPreviousReport();

    expect(result).toEqual(fakeReport);
    expect(mockReadFile).toHaveBeenCalledWith('/fake/reports/2026-01-15.json', 'utf-8');
  });

  it('should return null on corrupt JSON', async () => {
    mockReaddir.mockResolvedValue(['2026-01-15.json']);
    mockReadFile.mockResolvedValue('{ invalid json ');

    const { loadPreviousReport } = await import('../../src/utils/reports.js');
    const result = await loadPreviousReport();

    expect(result).toBeNull();
  });

  it('should return null when readdir fails', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const { loadPreviousReport } = await import('../../src/utils/reports.js');
    const result = await loadPreviousReport();

    expect(result).toBeNull();
  });
});
