import type {
  BackfillEstimate,
  BackfillStarted,
  BlacklistEntry,
  Chunk,
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
  LoggedRun,
  McpMetadata,
  MetricSeries,
  ModelBackfill,
  ModelInfo,
  Page,
  PageResult,
  PageStatus,
  ProjectionPoint,
  QueryLogDetail,
  ReadyStatus,
  RecomputeResult,
  ReplayAccepted,
  ReplayReport,
  ReplayRequest,
  ScoreReport,
  ScoreRequest,
  SearchRequest,
  SearchResponse,
  WhoAmI,
} from '../../domain/api-types';

export type RefineryApi = {
  whoami(): Promise<WhoAmI>;
  ready(): Promise<ReadyStatus>;
  getPage(id: string): Promise<Page>;
  getPageStatus(id: string): Promise<PageStatus>;
  getPageChunks(id: string): Promise<Chunk[]>;
  getPageEntities(id: string): Promise<Entity[]>;
  getSimilar(id: string, mediation?: string, k?: number): Promise<PageResult[]>;
  ingestPage(body: {
    canonical_url: string;
    body_extracted?: string;
    body_html?: string;
    title?: string;
  }): Promise<IngestOutcome>;
  search(body: SearchRequest): Promise<SearchResponse>;
  compare(body: CompareRequest): Promise<CompareResponse>;
  feedback(body: Feedback): Promise<void>;
  listJobs(params?: {
    status?: JobStatus;
    kind?: string;
    limit?: number;
  }): Promise<Job[]>;
  retryJob(id: string): Promise<Job>;
  listClusters(includeTombstoned?: boolean): Promise<Cluster[]>;
  getCluster(id: string): Promise<Cluster>;
  clusterRuns(): Promise<ClusterRun[]>;
  projection(runId?: string): Promise<ProjectionPoint[]>;
  recomputeClusters(): Promise<RecomputeResult>;
  getEntity(ref: string): Promise<Entity>;
  listModels(): Promise<ModelInfo[]>;
  registerModel(body: Record<string, unknown>): Promise<ModelInfo>;
  backfillEstimate(id: string): Promise<BackfillEstimate>;
  backfillStart(id: string): Promise<BackfillStarted>;
  backfillProgress(id: string): Promise<ModelBackfill>;
  activateModel(id: string): Promise<ModelInfo>;
  retireModel(id: string): Promise<void>;
  queryLog(params?: {
    since?: string;
    limit?: number;
    kind?: string;
  }): Promise<LoggedRun[]>;
  queryLogDetail(id: string): Promise<QueryLogDetail>;
  evalScore(body: ScoreRequest): Promise<ScoreReport>;
  evalReplay(body: ReplayRequest): Promise<ReplayAccepted>;
  evalReplayResult(jobId: string): Promise<ReplayReport>;
  metricsText(): Promise<string>;
  metricsTimeseries(params: {
    metric: string;
    since?: string;
    step?: string;
  }): Promise<MetricSeries>;
  config(): Promise<EffectiveConfig>;
  mcp(): Promise<McpMetadata>;
  blacklist(): Promise<BlacklistEntry[]>;
  removeBlacklist(id: string): Promise<void>;
  forget(body: { url?: string; domain?: string }): Promise<ForgetResult>;
};
