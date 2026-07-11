/**
 * Minimal Prometheus text-exposition parser. `/metrics` is not in OpenAPI, so
 * the cockpit reads the instantaneous text format and turns it into typed
 * samples for gauges and for client-side histogram-percentile estimates.
 */

export type PromSample = {
  name: string;
  labels: Record<string, string>;
  value: number;
};

export type PromMetrics = {
  samples: PromSample[];
};

const LINE = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+(.+)$/;

const parseLabels = (raw: string | undefined): Record<string, string> => {
  if (!raw) return {};
  const inner = raw.slice(1, -1).trim();
  if (!inner) return {};
  const labels: Record<string, string> = {};
  // Split on commas that separate `key="value"` pairs (values have no unescaped commas here).
  for (const part of inner.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part
      .slice(eq + 1)
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/\\"/g, '"')
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\');
    if (key) labels[key] = value;
  }
  return labels;
};

const parseValue = (raw: string): number => {
  const token = raw.trim().split(/\s+/)[0] ?? '';
  if (token === '+Inf') return Number.POSITIVE_INFINITY;
  if (token === '-Inf') return Number.NEGATIVE_INFINITY;
  if (token === 'NaN') return Number.NaN;
  return Number(token);
};

export function parsePrometheus(text: string): PromMetrics {
  const samples: PromSample[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = LINE.exec(line);
    if (!match) continue;
    const [, name, labelBlock, valueRaw] = match;
    if (name === undefined || valueRaw === undefined) continue;
    const value = parseValue(valueRaw);
    if (Number.isNaN(value)) continue;
    samples.push({ name, labels: parseLabels(labelBlock), value });
  }
  return { samples };
}

/** Sum a counter/gauge family, optionally grouped by a label key. */
export function sumByLabel(
  metrics: PromMetrics,
  name: string,
  labelKey?: string
): Map<string, number> {
  const out = new Map<string, number>();
  for (const sample of metrics.samples) {
    if (sample.name !== name) continue;
    const key = labelKey ? (sample.labels[labelKey] ?? '') : '';
    out.set(key, (out.get(key) ?? 0) + sample.value);
  }
  return out;
}

/** Latest scalar value of a single-series metric (first matching sample). */
export function gauge(metrics: PromMetrics, name: string): number | undefined {
  return metrics.samples.find((sample) => sample.name === name)?.value;
}

/**
 * Estimate a quantile from Prometheus histogram buckets
 * (`<name>_bucket{le="..."}`). Buckets are cumulative; the result is
 * bucket-estimated, not exact.
 */
export function histogramQuantile(
  metrics: PromMetrics,
  name: string,
  quantile: number,
  labelFilter: Record<string, string> = {}
): number | undefined {
  const bucketName = `${name}_bucket`;
  const buckets = metrics.samples
    .filter((sample) => sample.name === bucketName)
    .filter((sample) =>
      Object.entries(labelFilter).every(([k, v]) => sample.labels[k] === v)
    )
    .map((sample) => ({
      le:
        sample.labels.le === '+Inf'
          ? Number.POSITIVE_INFINITY
          : Number(sample.labels.le),
      count: sample.value,
    }))
    .filter((bucket) => !Number.isNaN(bucket.le))
    .sort((a, b) => a.le - b.le);

  const lastBucket = buckets.at(-1);
  if (!lastBucket) return undefined;
  const total = lastBucket.count;
  if (total <= 0) return undefined;

  const rank = quantile * total;
  let prevLe = 0;
  let prevCount = 0;
  for (const bucket of buckets) {
    if (bucket.count >= rank) {
      if (!Number.isFinite(bucket.le)) return prevLe;
      const span = bucket.count - prevCount;
      if (span <= 0) return bucket.le;
      // Linear interpolation within the bucket.
      return prevLe + ((rank - prevCount) / span) * (bucket.le - prevLe);
    }
    prevLe = bucket.le;
    prevCount = bucket.count;
  }
  return lastBucket.le;
}
