import { describe, it, expect } from 'vitest';
import {
  emptyGitHubSignals,
  emptyCoincidentSignals,
  emptyOnchainSignals,
  emptyConfirmingSignals,
} from '../../src/utils/empty-signals.js';

describe('emptyGitHubSignals', () => {
  it('should return valid structure with empty arrays and ISO period', () => {
    const result = emptyGitHubSignals();

    expect(result.repos).toEqual([]);
    expect(result.anomalies).toEqual([]);
    expect(result.newRepoClusters).toEqual([]);
    expect(() => new Date(result.period.start).toISOString()).not.toThrow();
    expect(() => new Date(result.period.end).toISOString()).not.toThrow();
    expect(new Date(result.period.end).getTime()).toBeGreaterThan(
      new Date(result.period.start).getTime(),
    );
  });
});

describe('emptyCoincidentSignals', () => {
  it('should return valid structure with correct nested shapes', () => {
    const result = emptyCoincidentSignals();

    expect(() => new Date(result.period.start).toISOString()).not.toThrow();
    expect(result.tvl).toEqual({ total: 0, totalDelta: 0, protocols: [], anomalies: [] });
    expect(result.dexVolumes).toEqual({ total: 0, protocols: [] });
    expect(result.stablecoinFlows).toEqual({ netFlow: 0, inflows: 0, outflows: 0 });
  });
});

describe('emptyOnchainSignals', () => {
  it('should return an empty array', () => {
    const result = emptyOnchainSignals();
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('emptyConfirmingSignals', () => {
  it('should return valid structure with empty arrays and ISO period', () => {
    const result = emptyConfirmingSignals();

    expect(result.tokens).toEqual([]);
    expect(result.trending).toEqual([]);
    expect(result.categoryPerformance).toEqual([]);
    expect(() => new Date(result.period.start).toISOString()).not.toThrow();
    expect(() => new Date(result.period.end).toISOString()).not.toThrow();
  });
});
