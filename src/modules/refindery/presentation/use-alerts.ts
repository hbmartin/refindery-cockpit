import { useMemo } from 'react';

import { useJobs, useMetricsText } from './hooks';
import { type Alert, deriveAlerts, gauge, parsePrometheus } from '../client';

/**
 * Derives the in-app alert set from live signals: dead-letter jobs plus the
 * "quietly wrong" canary metrics scraped from `/metrics`. Feeds nav badges and
 * the Pulse banner.
 */
export function useCockpitAlerts(): {
  alerts: Alert[];
  byLens: Map<string, Alert[]>;
} {
  const jobs = useJobs();
  const metrics = useMetricsText();

  return useMemo(() => {
    const deadJobs = (jobs.data ?? []).filter(
      (job) => job.status === 'dead'
    ).length;

    let tombstoneBacklog = 0;
    let queryLogDropped = 0;
    let purgedPageHits = 0;
    let embeddingErrors = 0;

    if (metrics.data) {
      const parsed = parsePrometheus(metrics.data);
      tombstoneBacklog =
        parsed.samples
          .filter(
            (s) =>
              s.name === 'vector_tombstone_backlog' &&
              s.labels.status === 'pending'
          )
          .reduce((sum, s) => sum + s.value, 0) || 0;
      queryLogDropped = gauge(parsed, 'query_log_dropped_total') ?? 0;
      purgedPageHits = gauge(parsed, 'purged_page_hits_total') ?? 0;
      embeddingErrors = parsed.samples
        .filter((s) => s.name === 'embedding_api_errors_total')
        .reduce((sum, s) => sum + s.value, 0);
    }

    const alerts = deriveAlerts({
      deadJobs,
      tombstoneBacklog,
      queryLogDropped,
      purgedPageHits,
      embeddingErrors,
    });

    const byLens = new Map<string, Alert[]>();
    for (const alert of alerts) {
      const list = byLens.get(alert.lens) ?? [];
      list.push(alert);
      byLens.set(alert.lens, list);
    }

    return { alerts, byLens };
  }, [jobs.data, metrics.data]);
}
