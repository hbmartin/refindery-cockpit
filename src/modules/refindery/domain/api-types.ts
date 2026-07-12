/**
 * Curated public types for the refindery HTTP API.
 *
 * Types that match the wire 1:1 are aliases into `api.gen.ts` (generated from
 * the committed `openapi.json` snapshot via `pnpm gen:api`; freshness enforced
 * by `pnpm gen:api:check`), so backend renames break the build here. Types that
 * deliberately diverge from the wire (`Cluster.cluster_id` vs wire `id`,
 * flattened statuses, lowest-common-denominator `PageResult`) stay hand-curated
 * and are anchored on the Raw side in `infrastructure/api.ts` instead.
 */
import type { components } from './api.gen';

type Schema<Name extends keyof components['schemas']> =
  components['schemas'][Name];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type TokenScope = 'read' | 'write';

/** Wire `scopes` stays `string[]`: unknown scopes must not fail validation. */
export type WhoAmI = Schema<'WhoAmIResponse'>;

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export type HealthStatus = { status: string };

export type ReadyStatus = {
  status: string;
  /** Capability flags, e.g. `{ metadata_store: true, active_model: true }`. */
  checks?: Record<string, boolean>;
  active_model?: string | null;
};

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export type PageState = Schema<'PageStatus'>;

export type PageStatus = {
  page_id: string;
  status: PageState;
  last_error?: string | null;
  entity_status?: string | null;
};

export type Chunk = {
  chunk_id: string;
  ordinal: number;
  text: string;
  token_count?: number | null;
  body_start?: number | null;
  body_end?: number | null;
};

export type Page = {
  page_id: string;
  canonical_url: string;
  title?: string | null;
  body_text?: string | null;
  status: PageState;
  last_error?: string | null;
  fetched_at?: string | null;
  indexed_at?: string | null;
};

export type IngestOutcome =
  | { outcome: 'queued'; page_id: string }
  | { outcome: 'revisit'; page_id: string }
  | { outcome: 'blacklisted'; pattern: string };

// ---------------------------------------------------------------------------
// Search / Compare
// ---------------------------------------------------------------------------

export type SearchFilters = Schema<'SearchFiltersBody'>;

export type SearchRequest = Schema<'SearchRequest'>;

export type MatchedChunk = {
  chunk_id: string;
  text: string;
  score: number;
  ordinal?: number | null;
};

export type PageResult = {
  page_id: string;
  canonical_url: string;
  title?: string | null;
  score: number;
  exact_match?: boolean;
  cluster?: { cluster_id: string; label?: string | null } | null;
  chunks: MatchedChunk[];
};

/** Per-stage retrieval timings, in milliseconds. */
export type StageTiming = {
  embed?: number;
  dense?: number;
  sparse?: number;
  fuse?: number;
  rollup?: number;
  rerank?: number;
  hydrate?: number;
  total?: number;
};

export type SearchResponse = {
  query_id: string;
  results: PageResult[];
  timing_ms?: StageTiming;
};

export type CompareRequest = Schema<'CompareRequest'>;

export type AgreementStats = Schema<'CompareAgreement'>;

export type CompareResponse = {
  query_id: string;
  per_model: { model: string; results: PageResult[] }[];
  agreement: AgreementStats[];
};

export type Feedback = Schema<'FeedbackRequest'>;

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type JobStatus = Schema<'JobStatus'>;

export type JobKind = string;

export type Job = Schema<'JobResponse'>;

// ---------------------------------------------------------------------------
// Clusters / Entities
// ---------------------------------------------------------------------------

export type Cluster = {
  cluster_id: string;
  label?: string | null;
  keywords?: string[];
  size: number;
  tombstoned?: boolean;
};

export type ClusterRun = {
  run_id: string;
  trigger?: string | null;
  algorithm?: string | null;
  n_pages: number | null;
  n_clusters: number | null;
  n_noise: number | null;
  duration_ms?: number | null;
  created_at?: string | null;
};

export type ProjectionPoint = {
  page_id: string;
  x: number;
  y: number;
  cluster_id?: string | null;
  title?: string | null;
};

export type EntityType =
  | 'PERSON'
  | 'ORG'
  | 'PRODUCT'
  | 'TECHNOLOGY'
  | 'CONCEPT'
  | 'PLACE'
  | 'WORK';

export type Entity = {
  entity_id: string;
  canonical_form: string;
  type: EntityType;
  aliases?: string[];
  mention_count: number;
  page_count: number;
  idf?: number | null;
};

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export type ModelState =
  | 'registered'
  | 'backfilling'
  | 'ready'
  | 'active'
  | 'retired';

export type ModelInfo = {
  model_id: string;
  provider?: string | null;
  dimensions?: number | null;
  state: ModelState;
  active: boolean;
};

export type ModelBackfill = Schema<'ModelBackfillResponse'>;

export type BackfillEstimate = Schema<'BackfillEstimateResponse'>;

export type BackfillStarted = Schema<'BackfillStartedResponse'>;

export type RecomputeResult = Schema<'RecomputeResponse'>;

// ---------------------------------------------------------------------------
// Eval
// ---------------------------------------------------------------------------

export type ScoreRequest = Schema<'EvalScoreRequest'>;

export type ModelScore = {
  model: string;
  ndcg: number;
  mrr: number;
  recall: number;
  recall_candidates?: number;
  rerank_lift?: number;
};

export type ScoreReport = {
  k: number;
  n_queries: number;
  per_model: ModelScore[];
};

export type ReplayRequest = {
  model_a: string;
  model_b: string;
  rerank_a?: boolean;
  rerank_b?: boolean;
  k?: number;
  candidates?: number;
  limit?: number;
};

export type ReplayAccepted = Schema<'EvalReplayAcceptedResponse'>;

export type ReplayReport = {
  job_id: string;
  status: JobStatus;
  report?: {
    k: number;
    golden_queries: number;
    arm_a: {
      label: string;
      ndcg: number;
      reciprocal_rank: number;
      recall: number;
    };
    arm_b: {
      label: string;
      ndcg: number;
      reciprocal_rank: number;
      recall: number;
    };
    deltas: Record<string, number>;
    queries: { query_text: string; ndcg_a: number; ndcg_b: number }[];
  } | null;
  error?: string | null;
};

// ---------------------------------------------------------------------------
// Query log
// ---------------------------------------------------------------------------

export type LoggedRun = {
  query_id: string;
  query: string;
  kind?: string | null;
  n_results: number;
  timing_ms?: number | null;
  created_at?: string | null;
  feedback?: { page_id: string; relevant: boolean }[];
};

export type QueryLogDetail = LoggedRun & {
  dense_hits?: { page_id: string; score: number }[];
  sparse_hits?: { page_id: string; score: number }[];
  fused_hits?: { page_id: string; score: number }[];
  final_hits?: { page_id: string; score: number }[];
  stage_timing?: StageTiming;
};

// ---------------------------------------------------------------------------
// Config / MCP / Blacklist / Metrics
// ---------------------------------------------------------------------------

export type ConfigField = {
  key: string;
  value: unknown;
  boot_only: boolean;
  group?: string;
};

export type EffectiveConfig = {
  fields: ConfigField[];
};

export type McpTool = {
  name: string;
  description?: string | null;
  mutating?: boolean;
};

export type McpMetadata = {
  tools: McpTool[];
  enable_mutating_tools: boolean;
};

export type BlacklistEntry = Schema<'BlacklistEntry'>;

export type ForgetResult = Schema<'ForgetResponse'>;

/** A downsampled point in a metrics time series. */
export type MetricSample = Schema<'MetricPointResponse'>;

export type MetricSampleSeries = Schema<'MetricSeriesResponse'>;

export type MetricSeries = Schema<'MetricsTimeseriesResponse'>;
