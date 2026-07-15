import { describe, expect, it } from 'vitest';

import {
  deriveAlerts,
  deriveCanaryInput,
  parsePrometheus,
} from '@/modules/refindery';

/**
 * The metric names below are deliberately hardcoded literals (never built from
 * exported constants): if the backend renames a metric and `canaries.ts`
 * follows, these tests fail loudly instead of the canary silently reading zero.
 */
const EXPOSITION = `
# HELP vector_tombstone_backlog Pending vector deletions
vector_tombstone_backlog{status="pending"} 120
vector_tombstone_backlog{status="applied"} 40
query_log_dropped_total 3
purged_page_hits_total 7
embedding_api_errors_total{provider="openai"} 2
embedding_api_errors_total{provider="voyage"} 1
`;

describe('deriveCanaryInput', () => {
  const parsed = parsePrometheus(EXPOSITION);

  it('sums only pending tombstones', () => {
    expect(deriveCanaryInput(parsed, []).tombstoneBacklog).toBe(120);
  });

  it('reads the dropped-rows and purged-hit gauges', () => {
    const input = deriveCanaryInput(parsed, []);
    expect(input.queryLogDropped).toBe(3);
    expect(input.purgedPageHits).toBe(7);
  });

  it('sums embedding errors across label sets', () => {
    expect(deriveCanaryInput(parsed, []).embeddingErrors).toBe(3);
  });

  it('counts only dead jobs', () => {
    const jobs = [
      { status: 'dead' },
      { status: 'running' },
      { status: 'done' },
      { status: 'dead' },
    ];
    expect(deriveCanaryInput(parsed, jobs).deadJobs).toBe(2);
  });

  it('yields all zeros for empty inputs', () => {
    expect(deriveCanaryInput(parsePrometheus(''), [])).toEqual({
      deadJobs: 0,
      tombstoneBacklog: 0,
      queryLogDropped: 0,
      purgedPageHits: 0,
      embeddingErrors: 0,
    });
  });

  it('trips the pulse canaries end-to-end from live metric names (fails on backend rename)', () => {
    const alerts = deriveAlerts(deriveCanaryInput(parsed, []));
    expect(alerts.map((alert) => alert.id)).toEqual([
      'tombstone-backlog',
      'query-log-dropped',
      'embedding-errors',
    ]);
  });
});
