/**
 * Typed endpoint facade over the refindery HTTP API. One method per documented
 * route; query hooks call these. Kept free of React so it can be unit-tested.
 */
import { httpClient } from './http-client';
import type {
  BackfillEstimate,
  BlacklistEntry,
  Cluster,
  ClusterRun,
  CompareRequest,
  CompareResponse,
  EffectiveConfig,
  Entity,
  Feedback,
  ForgetResult,
  IngestOutcome,
  Job,
  JobStatus,
  McpMetadata,
  MetricSeries,
  ModelBackfill,
  ModelInfo,
  Page,
  PageResult,
  PageStatus,
  ProjectionPoint,
  ReadyStatus,
  ReplayAccepted,
  ReplayReport,
  ReplayRequest,
  ScoreReport,
  ScoreRequest,
  SearchRequest,
  SearchResponse,
  WhoAmI,
} from '../domain/api-types';
import type { Chunk, LoggedRun, QueryLogDetail } from '../domain/api-types';

export const refineryApi = {
  // Auth / health
  whoami: () => httpClient.get<WhoAmI>('/v1/whoami'),
  ready: () => httpClient.get<ReadyStatus>('/readyz'),

  // Pages
  getPage: (id: string) =>
    httpClient.get<Page>(`/v1/pages/${encodeURIComponent(id)}`),
  getPageStatus: (id: string) =>
    httpClient.get<PageStatus>(`/v1/pages/${encodeURIComponent(id)}/status`),
  getPageChunks: (id: string) =>
    httpClient.get<Chunk[]>(`/v1/pages/${encodeURIComponent(id)}/chunks`),
  getPageEntities: (id: string) =>
    httpClient.get<Entity[]>(`/v1/pages/${encodeURIComponent(id)}/entities`),
  getSimilar: (id: string, mediation?: string, k?: number) =>
    httpClient.get<PageResult[]>(
      `/v1/pages/${encodeURIComponent(id)}/similar`,
      {
        mediation,
        k,
      }
    ),
  ingestPage: (body: {
    canonical_url: string;
    body_extracted?: string;
    body_html?: string;
    title?: string;
  }) => httpClient.post<IngestOutcome>('/v1/pages', body),

  // Search
  search: (body: SearchRequest) =>
    httpClient.post<SearchResponse>('/v1/search', body),
  compare: (body: CompareRequest) =>
    httpClient.post<CompareResponse>('/v1/compare', body),
  feedback: (body: Feedback) => httpClient.post<void>('/v1/feedback', body),

  // Jobs
  listJobs: (params?: { status?: JobStatus; kind?: string; limit?: number }) =>
    httpClient.get<Job[]>('/v1/jobs', params),
  retryJob: (id: string) =>
    httpClient.post<Job>(`/v1/jobs/${encodeURIComponent(id)}/retry`),

  // Clusters
  listClusters: (includeTombstoned?: boolean) =>
    httpClient.get<Cluster[]>('/v1/clusters', {
      include_tombstoned: includeTombstoned,
    }),
  getCluster: (id: string) =>
    httpClient.get<Cluster>(`/v1/clusters/${encodeURIComponent(id)}`),
  clusterRuns: () => httpClient.get<ClusterRun[]>('/v1/clusters/runs'),
  projection: (runId?: string) =>
    httpClient.get<ProjectionPoint[]>('/v1/clusters/projection', {
      run_id: runId,
    }),
  recomputeClusters: () =>
    httpClient.post<{ run_id?: string }>('/v1/clusters/recompute'),

  // Entities
  getEntity: (ref: string) =>
    httpClient.get<Entity>(`/v1/entities/${encodeURIComponent(ref)}`),

  // Models
  listModels: () => httpClient.get<ModelInfo[]>('/v1/models'),
  registerModel: (body: Record<string, unknown>) =>
    httpClient.post<ModelInfo>('/v1/models', body),
  backfillEstimate: (id: string) =>
    httpClient.post<BackfillEstimate>(
      `/v1/models/${encodeURIComponent(id)}/backfill`,
      {
        confirm: false,
      }
    ),
  backfillStart: (id: string) =>
    httpClient.post<ModelBackfill>(
      `/v1/models/${encodeURIComponent(id)}/backfill`,
      {
        confirm: true,
      }
    ),
  backfillProgress: (id: string) =>
    httpClient.get<ModelBackfill>(
      `/v1/models/${encodeURIComponent(id)}/backfill`
    ),
  activateModel: (id: string) =>
    httpClient.post<ModelInfo>(`/v1/models/${encodeURIComponent(id)}/activate`),
  retireModel: (id: string) =>
    httpClient.delete<void>(`/v1/models/${encodeURIComponent(id)}`),

  // Eval / query log
  queryLog: (params?: { since?: string; limit?: number; kind?: string }) =>
    httpClient.get<LoggedRun[]>('/v1/admin/query-log', params),
  queryLogDetail: (id: string) =>
    httpClient.get<QueryLogDetail>(
      `/v1/admin/query-log/${encodeURIComponent(id)}`
    ),
  evalScore: (body: ScoreRequest) =>
    httpClient.post<ScoreReport>('/v1/admin/eval/score', body),
  evalReplay: (body: ReplayRequest) =>
    httpClient.post<ReplayAccepted>('/v1/admin/eval/replay', body),
  evalReplayResult: (jobId: string) =>
    httpClient.get<ReplayReport>(
      `/v1/admin/eval/replay/${encodeURIComponent(jobId)}`
    ),

  // Metrics
  metricsText: () => httpClient.metricsText(),
  metricsTimeseries: (params: {
    metric: string;
    since?: string;
    step?: string;
  }) => httpClient.get<MetricSeries>('/v1/admin/metrics/timeseries', params),

  // Config / MCP / blacklist / forget
  config: () => httpClient.get<EffectiveConfig>('/v1/admin/config'),
  mcp: () => httpClient.get<McpMetadata>('/v1/admin/mcp'),
  blacklist: () => httpClient.get<BlacklistEntry[]>('/v1/blacklist'),
  removeBlacklist: (id: string) =>
    httpClient.delete<void>(`/v1/blacklist/${encodeURIComponent(id)}`),
  forget: (body: { url?: string; domain?: string }) =>
    httpClient.post<ForgetResult>('/v1/forget', body),
};

export type RefineryApi = typeof refineryApi;
