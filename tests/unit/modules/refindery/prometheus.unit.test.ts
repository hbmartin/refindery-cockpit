import { describe, expect, it } from 'vitest';

import {
  gauge,
  histogramQuantile,
  parsePrometheus,
  sumByLabel,
} from '@/modules/refindery';

const SAMPLE = `
# HELP ingest_pages_total Total ingested pages
# TYPE ingest_pages_total counter
ingest_pages_total{outcome="indexed"} 120
ingest_pages_total{outcome="failed"} 3
queue_depth 7
vector_tombstone_backlog{status="pending"} 42
search_duration_seconds_bucket{le="0.1"} 5
search_duration_seconds_bucket{le="0.5"} 15
search_duration_seconds_bucket{le="1"} 20
search_duration_seconds_bucket{le="+Inf"} 20
`;

describe('parsePrometheus', () => {
  it('parses samples with labels and values, ignoring comments', () => {
    const metrics = parsePrometheus(SAMPLE);
    expect(metrics.samples).toHaveLength(8);
    const queue = metrics.samples.find((s) => s.name === 'queue_depth');
    expect(queue?.value).toBe(7);
    const failed = metrics.samples.find(
      (s) => s.name === 'ingest_pages_total' && s.labels.outcome === 'failed'
    );
    expect(failed?.value).toBe(3);
  });

  it('gauge reads a single-series scalar', () => {
    expect(gauge(parsePrometheus(SAMPLE), 'queue_depth')).toBe(7);
    expect(gauge(parsePrometheus(SAMPLE), 'nonexistent')).toBeUndefined();
  });

  it('sumByLabel groups a counter family by label', () => {
    const byOutcome = sumByLabel(
      parsePrometheus(SAMPLE),
      'ingest_pages_total',
      'outcome'
    );
    expect(byOutcome.get('indexed')).toBe(120);
    expect(byOutcome.get('failed')).toBe(3);
  });

  it('histogramQuantile estimates a percentile from cumulative buckets', () => {
    const p50 = histogramQuantile(
      parsePrometheus(SAMPLE),
      'search_duration_seconds',
      0.5
    );
    // rank = 0.5 * 20 = 10, falls in the le=0.5 bucket (cum 15 from prev 5).
    expect(p50).toBeGreaterThan(0.1);
    expect(p50).toBeLessThanOrEqual(0.5);
  });

  it('histogramQuantile returns undefined when no buckets exist', () => {
    expect(
      histogramQuantile(parsePrometheus('queue_depth 1'), 'absent', 0.9)
    ).toBeUndefined();
  });
});
