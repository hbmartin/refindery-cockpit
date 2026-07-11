/**
 * Hand-modeled types for the refindery HTTP API.
 *
 * The cockpit plan calls for generating these from a running refindery's
 * `GET /openapi.json` via `pnpm gen:api` (openapi-typescript). Until an instance
 * is reachable at build time, these mirror the documented HTTP API
 * (https://hbmartin.github.io/refindery/reference/http-api/) and the field names
 * referenced in the cockpit planning doc. Regenerate to replace this file once a
 * refindery instance is available; the query hooks depend only on the exported
 * names here, so swapping in generated types is a localized change.
 */

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export type TokenScope = 'read' | 'write';

export type WhoAmI = {
  name: string;
  scopes: TokenScope[];
};

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

export type PageState = 'queued' | 'indexing' | 'indexed' | 'failed' | 'dead';

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

export type SearchFilters = {
  domain?: string;
  after?: string;
  before?: string;
  cluster_id?: string;
  entity_id?: string;
};

export type SearchRequest = {
  query: string;
  k?: number;
  candidates?: number;
  rerank?: boolean;
  chunks_per_page?: number;
  rollup?: 'max' | 'mean' | 'sum';
  recency_half_life_days?: number | null;
  filters?: SearchFilters;
};

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

export type CompareRequest = {
  query: string;
  models: string[];
  k?: number;
};

export type AgreementStats = {
  model_a: string;
  model_b: string;
  jaccard_at_k?: number;
  rbo?: number;
  kendall_tau?: number;
  intersection_size?: number;
};

export type CompareResponse = {
  query_id: string;
  per_model: { model: string; results: PageResult[] }[];
  agreement: AgreementStats[];
};

export type Feedback = {
  query_id: string;
  page_id: string;
  relevant: boolean;
};

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type JobStatus = 'pending' | 'running' | 'done' | 'failed' | 'dead';

export type JobKind = string;

export type Job = {
  job_id: string;
  kind: JobKind;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

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
  n_pages: number;
  n_clusters: number;
  n_noise: number;
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

export type ModelBackfill = {
  model_id: string;
  embedded_chunks: number;
  total_chunks: number;
  last_error?: string | null;
  done?: boolean;
};

export type BackfillEstimate = {
  n_chunks: number;
  total_tokens: number;
  est_cost_usd: number;
  est_duration_s: number;
};

// ---------------------------------------------------------------------------
// Eval
// ---------------------------------------------------------------------------

export type ScoreRequest = {
  k?: number;
  since?: string;
  model?: string;
};

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

export type ReplayAccepted = {
  job_id: string;
  result_url?: string;
};

export type ReplayReport = {
  job_id: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  model_a: string;
  model_b: string;
  delta_ndcg?: number;
  per_query?: { query_id: string; ndcg_a: number; ndcg_b: number }[];
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

export type BlacklistEntry = {
  id: string;
  pattern: string;
  created_at?: string | null;
};

export type ForgetResult = {
  pages_purged: number;
  vector_deletes_queued: number;
};

/** A downsampled point in a metrics time series. */
export type MetricSample = {
  t: string;
  value: number;
  labels?: Record<string, string>;
};

export type MetricSeries = {
  metric: string;
  points: MetricSample[];
};
