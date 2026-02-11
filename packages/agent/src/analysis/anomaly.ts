// Pure math anomaly detection — no LLM involved
// Uses z-score to identify statistically significant deviations

export interface AnomalyResult<T> {
  item: T;
  metric: string;
  value: number;
  mean: number;
  stdDev: number;
  zScore: number;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function zScore(value: number, avg: number, sd: number): number {
  if (sd === 0) return 0;
  return (value - avg) / sd;
}

/**
 * Detect anomalies in a collection using z-score analysis.
 * Returns items whose z-score exceeds the threshold.
 */
export function detectAnomalies<T>(
  items: T[],
  extractValue: (item: T) => number,
  metricName: string,
  threshold: number = 2.0,
): AnomalyResult<T>[] {
  const values = items.map(extractValue);
  const avg = mean(values);
  const sd = stdDev(values, avg);

  if (sd === 0) return []; // no variance, no anomalies

  return items
    .map(item => {
      const value = extractValue(item);
      const z = zScore(value, avg, sd);
      return { item, metric: metricName, value, mean: avg, stdDev: sd, zScore: z };
    })
    .filter(r => Math.abs(r.zScore) >= threshold)
    .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

/**
 * Run anomaly detection across multiple metrics for the same items.
 * Returns items that are anomalous on ANY metric.
 */
export function detectMultiMetricAnomalies<T>(
  items: T[],
  metrics: Array<{ name: string; extract: (item: T) => number }>,
  threshold: number = 2.0,
): Map<T, AnomalyResult<T>[]> {
  const anomalyMap = new Map<T, AnomalyResult<T>[]>();

  for (const metric of metrics) {
    const anomalies = detectAnomalies(items, metric.extract, metric.name, threshold);
    for (const anomaly of anomalies) {
      const existing = anomalyMap.get(anomaly.item) ?? [];
      existing.push(anomaly);
      anomalyMap.set(anomaly.item, existing);
    }
  }

  return anomalyMap;
}

/**
 * Enrich items with z-scores for a given metric.
 * Mutates the setZScore callback for each item.
 */
export function enrichWithZScores<T>(
  items: T[],
  extractValue: (item: T) => number,
  setZScore: (item: T, z: number) => void,
): void {
  const values = items.map(extractValue);
  const avg = mean(values);
  const sd = stdDev(values, avg);

  for (const item of items) {
    setZScore(item, sd === 0 ? 0 : zScore(extractValue(item), avg, sd));
  }
}
