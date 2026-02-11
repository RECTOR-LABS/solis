import { describe, it, expect } from 'vitest';
import { detectAnomalies, detectMultiMetricAnomalies, enrichWithZScores, zScore } from '../../src/analysis/anomaly.js';

describe('zScore', () => {
  it('should return 0 when stdDev is 0', () => {
    expect(zScore(5, 5, 0)).toBe(0);
  });

  it('should compute correct z-score', () => {
    expect(zScore(10, 5, 2.5)).toBe(2);
    expect(zScore(0, 5, 2.5)).toBe(-2);
  });

  it('should handle negative z-scores', () => {
    expect(zScore(3, 10, 2)).toBe(-3.5);
  });
});

describe('detectAnomalies', () => {
  const items = [
    { name: 'A', value: 10 },
    { name: 'B', value: 12 },
    { name: 'C', value: 11 },
    { name: 'D', value: 50 }, // outlier
    { name: 'E', value: 9 },
    { name: 'F', value: 13 },
  ];

  it('should detect the outlier', () => {
    const anomalies = detectAnomalies(items, i => i.value, 'value', 2.0);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].item.name).toBe('D');
    expect(anomalies[0].zScore).toBeGreaterThan(2);
  });

  it('should return empty for uniform data', () => {
    const uniform = [
      { name: 'A', value: 10 },
      { name: 'B', value: 10 },
      { name: 'C', value: 10 },
    ];
    const anomalies = detectAnomalies(uniform, i => i.value, 'value');
    expect(anomalies).toHaveLength(0);
  });

  it('should sort by absolute z-score descending', () => {
    const data = [
      { name: 'A', value: 1 },
      { name: 'B', value: 2 },
      { name: 'C', value: 100 }, // big positive
      { name: 'D', value: -80 }, // big negative
      { name: 'E', value: 3 },
    ];
    const anomalies = detectAnomalies(data, i => i.value, 'value', 1.0);
    if (anomalies.length > 1) {
      expect(Math.abs(anomalies[0].zScore)).toBeGreaterThanOrEqual(Math.abs(anomalies[1].zScore));
    }
  });

  it('should use custom threshold', () => {
    const anomaliesLow = detectAnomalies(items, i => i.value, 'value', 1.0);
    const anomaliesHigh = detectAnomalies(items, i => i.value, 'value', 3.0);
    expect(anomaliesLow.length).toBeGreaterThanOrEqual(anomaliesHigh.length);
  });

  it('should return empty for empty input', () => {
    expect(detectAnomalies([], (i: number) => i, 'value')).toHaveLength(0);
  });

  it('should return empty for single item', () => {
    const anomalies = detectAnomalies([{ v: 100 }], i => i.v, 'value');
    expect(anomalies).toHaveLength(0);
  });
});

describe('detectMultiMetricAnomalies', () => {
  it('should detect anomalies across multiple metrics', () => {
    const items = [
      { name: 'A', stars: 10, commits: 5 },
      { name: 'B', stars: 11, commits: 6 },
      { name: 'C', stars: 12, commits: 7 },
      { name: 'D', stars: 10, commits: 5 },
      { name: 'E', stars: 11, commits: 6 },
      { name: 'F', stars: 200, commits: 500 }, // clear outlier on both
    ];

    const metrics = [
      { name: 'stars', extract: (i: typeof items[0]) => i.stars },
      { name: 'commits', extract: (i: typeof items[0]) => i.commits },
    ];

    const result = detectMultiMetricAnomalies(items, metrics, 1.5);
    expect(result.size).toBeGreaterThan(0);
    // F should be detected on both metrics
    const fAnomalies = [...result.entries()].find(([item]) => item.name === 'F');
    expect(fAnomalies).toBeDefined();
    expect(fAnomalies![1].length).toBe(2); // anomalous on both metrics
  });
});

describe('enrichWithZScores', () => {
  it('should set z-scores on items', () => {
    const items = [
      { value: 10, zScore: 0 },
      { value: 20, zScore: 0 },
      { value: 30, zScore: 0 },
      { value: 100, zScore: 0 },
    ];

    enrichWithZScores(items, i => i.value, (i, z) => { i.zScore = z; });

    // The outlier (100) should have highest z-score
    expect(items[3].zScore).toBeGreaterThan(items[0].zScore);
    expect(items[3].zScore).toBeGreaterThan(1);
  });

  it('should handle uniform data', () => {
    const items = [
      { value: 5, zScore: 0 },
      { value: 5, zScore: 0 },
      { value: 5, zScore: 0 },
    ];

    enrichWithZScores(items, i => i.value, (i, z) => { i.zScore = z; });

    for (const item of items) {
      expect(item.zScore).toBe(0);
    }
  });
});
