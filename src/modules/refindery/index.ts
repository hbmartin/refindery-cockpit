/** Domain types + stable constants for the refindery API surface. */
export type * from './domain/api-types';
export { deriveCanaryInput } from './domain/canaries';
export type { ApiError, ApiErrorKind } from './domain/errors';
export { contractError, isApiError, parseApiError } from './domain/errors';
export type { PromMetrics, PromSample } from './domain/prometheus';
export {
  gauge,
  histogramQuantile,
  parsePrometheus,
  sumByLabel,
} from './domain/prometheus';
export type { Alert, AlertSeverity, CanaryInput } from './domain/thresholds';
export {
  deriveAlerts,
  EMBEDDING_ERROR_WARN,
  TOMBSTONE_BACKLOG_WARN,
} from './domain/thresholds';
