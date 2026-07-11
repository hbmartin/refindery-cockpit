/**
 * Client-only public gate for the refindery module: the typed API facade, the
 * bearer-token hooks, query keys/poll cadences, and the error/metrics helpers
 * the lenses need. Presentation imports from here, never from infrastructure.
 */
export {
  type ApiError,
  type ApiErrorKind,
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
export { type RefineryApi, refineryApi } from './infrastructure/api';
export { errorMessage } from './presentation/hooks';
export { POLL, refineryKeys } from './presentation/query-keys';
export { setToken, useHasToken, useToken } from './presentation/use-token';
