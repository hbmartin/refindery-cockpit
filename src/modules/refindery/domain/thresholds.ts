/**
 * Threshold-driven, in-app alerting. Each lens carries a badge when its signal
 * trips; the Pulse banner aggregates the "quietly wrong" canary metrics.
 */

export type AlertSeverity = 'warning' | 'critical';

export type Alert = {
  id: string;
  severity: AlertSeverity;
  label: string;
  /** Nav lens this alert belongs to, for badge placement. */
  lens: string;
};

export type CanaryInput = {
  deadJobs: number;
  tombstoneBacklog: number;
  queryLogDropped: number;
  purgedPageHits: number;
  embeddingErrors: number;
};

export const TOMBSTONE_BACKLOG_WARN = 100;
export const EMBEDDING_ERROR_WARN = 1;

export function deriveAlerts(input: Partial<CanaryInput>): Alert[] {
  const alerts: Alert[] = [];

  if ((input.deadJobs ?? 0) > 0) {
    alerts.push({
      id: 'dead-jobs',
      severity: 'critical',
      label: `${input.deadJobs} dead job${input.deadJobs === 1 ? '' : 's'}`,
      lens: 'jobs',
    });
  }

  if ((input.tombstoneBacklog ?? 0) > TOMBSTONE_BACKLOG_WARN) {
    alerts.push({
      id: 'tombstone-backlog',
      severity: 'warning',
      label: `${input.tombstoneBacklog} pending vector tombstones`,
      lens: 'pulse',
    });
  }

  if ((input.queryLogDropped ?? 0) > 0) {
    alerts.push({
      id: 'query-log-dropped',
      severity: 'warning',
      label: `${input.queryLogDropped} query-log rows dropped`,
      lens: 'pulse',
    });
  }

  if ((input.embeddingErrors ?? 0) >= EMBEDDING_ERROR_WARN) {
    alerts.push({
      id: 'embedding-errors',
      severity: 'warning',
      label: `${input.embeddingErrors} embedding API errors`,
      lens: 'pulse',
    });
  }

  return alerts;
}
