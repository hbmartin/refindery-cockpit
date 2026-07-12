/**
 * Client-only public gate for the refindery module: the typed API facade, the
 * bearer-token hooks, query keys/poll cadences, and the error/metrics helpers
 * the lenses need. Presentation imports from here, never from infrastructure.
 */
export type { RefineryApi } from './application/ports/refinery-api';
export { deriveCanaryInput } from './domain/canaries';
export {
  type ApiError,
  type ApiErrorKind,
  contractError,
  isApiError,
  parseApiError,
} from './domain/errors';
export {
  gauge,
  histogramQuantile,
  parsePrometheus,
  type PromMetrics,
  sumByLabel,
} from './domain/prometheus';
export {
  type Alert,
  type AlertSeverity,
  deriveAlerts,
} from './domain/thresholds';
export { errorMessage } from './presentation/hooks';
export { POLL, refineryKeys } from './presentation/query-keys';
export { useHasToken, useSetToken, useToken } from './presentation/use-token';
