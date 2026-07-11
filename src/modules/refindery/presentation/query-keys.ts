/**
 * Central query-key factory. Every key is prefixed with the token identity so
 * switching tokens invalidates all cached refindery data cleanly.
 */
export const refineryKeys = {
  all: ['refindery'] as const,
  whoami: () => [...refineryKeys.all, 'whoami'] as const,
  ready: () => [...refineryKeys.all, 'ready'] as const,
  metricsText: () => [...refineryKeys.all, 'metrics-text'] as const,
  metricsSeries: (metric: string, since?: string, step?: string) =>
    [
      ...refineryKeys.all,
      'metrics-series',
      metric,
      since ?? '',
      step ?? '',
    ] as const,
  jobs: (params?: Record<string, unknown>) =>
    [...refineryKeys.all, 'jobs', params ?? {}] as const,
  clusters: (includeTombstoned?: boolean) =>
    [...refineryKeys.all, 'clusters', includeTombstoned ?? false] as const,
  cluster: (id: string) => [...refineryKeys.all, 'cluster', id] as const,
  clusterRuns: () => [...refineryKeys.all, 'cluster-runs'] as const,
  projection: (runId?: string) =>
    [...refineryKeys.all, 'projection', runId ?? 'latest'] as const,
  entity: (ref: string) => [...refineryKeys.all, 'entity', ref] as const,
  models: () => [...refineryKeys.all, 'models'] as const,
  backfill: (id: string) => [...refineryKeys.all, 'backfill', id] as const,
  queryLog: (params?: Record<string, unknown>) =>
    [...refineryKeys.all, 'query-log', params ?? {}] as const,
  queryLogDetail: (id: string) =>
    [...refineryKeys.all, 'query-log-detail', id] as const,
  config: () => [...refineryKeys.all, 'config'] as const,
  mcp: () => [...refineryKeys.all, 'mcp'] as const,
  blacklist: () => [...refineryKeys.all, 'blacklist'] as const,
  page: (id: string) => [...refineryKeys.all, 'page', id] as const,
  pageStatus: (id: string) => [...refineryKeys.all, 'page-status', id] as const,
  pageChunks: (id: string) => [...refineryKeys.all, 'page-chunks', id] as const,
  pageEntities: (id: string) =>
    [...refineryKeys.all, 'page-entities', id] as const,
  similar: (id: string) => [...refineryKeys.all, 'similar', id] as const,
} as const;

export const POLL = {
  fast: 2_000,
  medium: 5_000,
  slow: 30_000,
} as const;
