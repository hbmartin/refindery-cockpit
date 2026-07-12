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

describe('parsePrometheus value handling', () => {
  it('parses +Inf, -Inf, and drops NaN samples', () => {
    const metrics = parsePrometheus(
      ['up_high +Inf', 'up_low -Inf', 'broken NaN'].join('\n')
    );
    expect(gauge(metrics, 'up_high')).toBe(Number.POSITIVE_INFINITY);
    expect(gauge(metrics, 'up_low')).toBe(Number.NEGATIVE_INFINITY);
    expect(metrics.samples.find((s) => s.name === 'broken')).toBeUndefined();
  });

  it('ignores a trailing timestamp after the value', () => {
    expect(
      gauge(parsePrometheus('queue_depth 7 1699999999'), 'queue_depth')
    ).toBe(7);
  });

  it('unescapes quotes, newlines, and backslashes in label values', () => {
    const metrics = parsePrometheus(
      'errs{msg="say \\"hi\\"",path="a\\\\b",text="line\\nbreak"} 1'
    );
    const sample = metrics.samples[0];
    expect(sample?.labels.msg).toBe('say "hi"');
    expect(sample?.labels.path).toBe('a\\b');
    expect(sample?.labels.text).toBe('line\nbreak');
  });

  it('handles empty label blocks and skips malformed pairs', () => {
    const metrics = parsePrometheus('empty{} 3\nweird{noequals} 4');
    expect(gauge(metrics, 'empty')).toBe(3);
    expect(metrics.samples.find((s) => s.name === 'weird')?.labels).toEqual({});
  });

  it('splits label values containing commas correctly', () => {
    const metrics = parsePrometheus('m{a="x,y",b="z"} 2');
    expect(metrics.samples[0]?.labels).toEqual({ a: 'x,y', b: 'z' });
  });
});

describe('sumByLabel and gauge details', () => {
  it('sums everything under the empty key without a labelKey', () => {
    const totals = sumByLabel(parsePrometheus(SAMPLE), 'ingest_pages_total');
    expect(totals.get('')).toBe(123);
  });

  it('groups samples missing the label under the empty key', () => {
    const totals = sumByLabel(parsePrometheus('m{k="a"} 1\nm 2'), 'm', 'k');
    expect(totals.get('a')).toBe(1);
    expect(totals.get('')).toBe(2);
  });

  it('gauge returns the first matching sample', () => {
    expect(gauge(parsePrometheus('m{k="a"} 1\nm{k="b"} 2'), 'm')).toBe(1);
  });
});

describe('histogramQuantile details', () => {
  it('interpolates linearly inside a bucket', () => {
    const metrics = parsePrometheus(SAMPLE);
    // rank = 0.5 * 20 = 10; bucket le=0.5 spans counts 5..15 over 0.1..0.5:
    // 0.1 + ((10 - 5) / 10) * (0.5 - 0.1) = 0.3
    expect(
      histogramQuantile(metrics, 'search_duration_seconds', 0.5)
    ).toBeCloseTo(0.3, 10);
    // rank = 0.25 * 20 = 5 lands exactly on the first bucket boundary.
    expect(
      histogramQuantile(metrics, 'search_duration_seconds', 0.25)
    ).toBeCloseTo(0.1, 10);
  });

  it('returns the previous finite boundary when the rank falls in +Inf', () => {
    const metrics = parsePrometheus(
      ['h_bucket{le="0.1"} 5', 'h_bucket{le="+Inf"} 10'].join('\n')
    );
    expect(histogramQuantile(metrics, 'h', 0.9)).toBe(0.1);
  });

  it('returns undefined when the histogram is empty', () => {
    const metrics = parsePrometheus(
      ['h_bucket{le="0.1"} 0', 'h_bucket{le="+Inf"} 0'].join('\n')
    );
    expect(histogramQuantile(metrics, 'h', 0.5)).toBeUndefined();
  });

  it('respects a label filter to select one series', () => {
    const metrics = parsePrometheus(
      [
        'h_bucket{model="a",le="1"} 10',
        'h_bucket{model="a",le="+Inf"} 10',
        'h_bucket{model="b",le="5"} 10',
        'h_bucket{model="b",le="+Inf"} 10',
      ].join('\n')
    );
    expect(histogramQuantile(metrics, 'h', 0.5, { model: 'a' })).toBeCloseTo(
      0.5,
      10
    );
    expect(histogramQuantile(metrics, 'h', 0.5, { model: 'b' })).toBeCloseTo(
      2.5,
      10
    );
  });
});
