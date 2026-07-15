/**
 * Maps the scraped `/metrics` exposition plus the live job list onto the
 * canary inputs consumed by `deriveAlerts`. The metric names are load-bearing:
 * a backend rename makes a canary silently read zero, so the unit tests pin
 * each name and fail loudly instead.
 */
import { gauge, type PromMetrics } from './prometheus';
import type { CanaryInput } from './thresholds';

export function deriveCanaryInput(
  metrics: PromMetrics,
  jobs: readonly { status: string }[]
): CanaryInput {
  return {
    deadJobs: jobs.filter((job) => job.status === 'dead').length,
    tombstoneBacklog: metrics.samples
      .filter(
        (sample) =>
          sample.name === 'vector_tombstone_backlog' &&
          sample.labels.status === 'pending'
      )
      .reduce((sum, sample) => sum + sample.value, 0),
    queryLogDropped: gauge(metrics, 'query_log_dropped_total') ?? 0,
    purgedPageHits: gauge(metrics, 'purged_page_hits_total') ?? 0,
    embeddingErrors: metrics.samples
      .filter((sample) => sample.name === 'embedding_api_errors_total')
      .reduce((sum, sample) => sum + sample.value, 0),
  };
}
