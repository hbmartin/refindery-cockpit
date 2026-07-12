import { z } from 'zod';

import { httpClient, type RefineryHttpClient } from './http-client';
import {
  backfillEstimateSchema,
  backfillStartedSchema,
  blacklistResponseSchema,
  forgetResponseSchema,
  ingestResponseSchema,
  jobListSchema,
  jobSchema,
  modelListSchema,
  rawModelSchema,
  readySchema,
  recomputeSchema,
  whoAmISchema,
} from './schemas';
import type { RefineryApi } from '../application/ports/refinery-api';
import type { components } from '../domain/api.gen';
import type {
  Cluster,
  ClusterRun,
  ConfigField,
  EffectiveConfig,
  Entity,
  LoggedRun,
  ModelInfo,
  PageResult,
  QueryLogDetail,
  ScoreReport,
} from '../domain/api-types';
import { contractError } from '../domain/errors';

/** Wire shapes come straight from the generated OpenAPI types: a backend
 * rename breaks the build at the mapping site instead of drifting silently. */
type Schema<Name extends keyof components['schemas']> =
  components['schemas'][Name];

type RawPageResult = Schema<'PageResult'>;
type RawCluster = Schema<'ClusterSummary'>;
type RawClusterRun = Schema<'ClusterRunResponse'>;
type RawEntity = Schema<'EntitySummary'>;
type RawModel = Schema<'ModelInfo'>;
type RawLoggedRun = Schema<'QueryLogRunResponse'>;
type RawScoreReport = Schema<'ScoreReport'>;

/** Validate a 2xx body against its response schema; failures surface as a
 * `contract` ApiError so the UI names the drift instead of crashing downstream. */
const parse = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  endpoint: string
): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw contractError(
      `Unexpected response shape from ${endpoint} — refindery and cockpit are out of sync`,
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      }))
    );
  }
  return result.data;
};

const mapPageResult = (result: RawPageResult): PageResult => ({
  ...result,
  cluster: result.cluster
    ? { cluster_id: result.cluster.id, label: result.cluster.label }
    : null,
});

const mapCluster = (cluster: RawCluster): Cluster => ({
  cluster_id: cluster.id,
  label: cluster.label,
  keywords: cluster.keywords,
  size: cluster.size,
  tombstoned: cluster.tombstoned,
});

const mapClusterRun = (run: RawClusterRun): ClusterRun => ({
  run_id: run.id,
  trigger: run.trigger,
  algorithm: run.algorithm,
  n_pages: run.n_pages,
  n_clusters: run.n_clusters,
  n_noise: run.n_noise,
  duration_ms: run.duration_ms,
  created_at: run.started_at,
});

const mapEntity = (entity: RawEntity, aliases?: string[]): Entity => ({
  entity_id: entity.id,
  canonical_form: entity.canonical_form,
  type: entity.type as Entity['type'],
  aliases,
  mention_count: entity.mention_count,
  page_count: entity.page_count,
  idf: entity.idf,
});

const modelState = (status: string): ModelInfo['state'] => {
  switch (status) {
    case 'active':
    case 'backfilling':
    case 'ready':
    case 'registered':
    case 'retired':
      return status;
    default:
      throw contractError(`Unsupported refindery model status: ${status}`);
  }
};

const mapModel = (model: RawModel): ModelInfo => ({
  model_id: model.id,
  provider: model.provider,
  dimensions: model.dim,
  state: modelState(model.status),
  active: model.is_active,
});

const mapLoggedRun = (run: RawLoggedRun): LoggedRun => ({
  query_id: run.query_id,
  query: run.query_text,
  kind: run.kind,
  n_results: run.final_pages.length,
  timing_ms: run.timing_ms.total,
  created_at: run.ts,
  feedback: Object.entries(run.feedback).map(([page_id, relevant]) => ({
    page_id,
    relevant,
  })),
});

const mapQueryLogDetail = (run: RawLoggedRun): QueryLogDetail => ({
  ...mapLoggedRun(run),
  dense_hits: run.dense_hits,
  sparse_hits: run.sparse_hits,
  fused_hits: run.candidate_set,
  final_hits: run.final_pages,
  stage_timing: run.timing_ms,
});

const mapScoreReport = (report: RawScoreReport): ScoreReport => ({
  k: report.k,
  n_queries: report.scored,
  per_model: report.models.map((model) => ({
    model: model.model,
    ndcg: model.ndcg,
    mrr: model.reciprocal_rank,
    recall: model.recall,
    recall_candidates: model.recall_candidates,
    rerank_lift: model.rerank_lift ?? undefined,
  })),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const configFields = (
  settings: Record<string, unknown>,
  mutability: Record<string, string>
): ConfigField[] => {
  const fields: ConfigField[] = [];

  const visit = (value: unknown, path: string[]) => {
    if (isRecord(value)) {
      for (const [key, child] of Object.entries(value)) {
        visit(child, [...path, key]);
      }
      return;
    }

    const key = path.join('.');
    fields.push({
      key,
      value,
      boot_only: mutability[key] === 'boot_only',
      group: path[0] ?? 'general',
    });
  };

  visit(settings, []);
  return fields;
};

export function createRefineryApi(client: RefineryHttpClient): RefineryApi {
  return {
    whoami: async () =>
      parse(whoAmISchema, await client.get('/v1/whoami'), 'GET /v1/whoami'),
    ready: async () =>
      parse(readySchema, await client.get('/readyz'), 'GET /readyz'),

    getPage: (id) => client.get(`/v1/pages/${encodeURIComponent(id)}`),
    async getPageStatus(id) {
      const response = await client.get<Schema<'PageStatusResponse'>>(
        `/v1/pages/${encodeURIComponent(id)}/status`
      );
      return {
        page_id: response.page_id,
        status: response.status,
        last_error: response.last_error,
        entity_status: response.features?.entities?.status,
      };
    },
    async getPageChunks(id) {
      const response = await client.get<Schema<'PageChunksResponse'>>(
        `/v1/pages/${encodeURIComponent(id)}/chunks`
      );
      return response.chunks.map((chunk) => ({
        chunk_id: chunk.chunk_id,
        ordinal: chunk.ordinal,
        text: chunk.text,
        token_count: chunk.token_count,
        body_start: chunk.char_start,
        body_end: chunk.char_end,
      }));
    },
    async getPageEntities(id) {
      const response = await client.get<Schema<'PageEntitiesResponse'>>(
        `/v1/pages/${encodeURIComponent(id)}/entities`
      );
      return response.entities.map((entity) => mapEntity(entity));
    },
    async getSimilar(id, mediation, k) {
      const response = await client.get<Schema<'SimilarResponse'>>(
        `/v1/pages/${encodeURIComponent(id)}/similar`,
        { mediation, k }
      );
      return response.results.map((result) => ({ ...result, chunks: [] }));
    },
    async ingestPage(body) {
      const response = parse(
        ingestResponseSchema,
        await client.post('/v1/pages', {
          url: body.canonical_url,
          title: body.title,
          body_extracted: body.body_extracted,
          body_html: body.body_html,
        }),
        'POST /v1/pages'
      );
      return 'revisit' in response && response.revisit
        ? { outcome: 'revisit', page_id: response.page_id }
        : { outcome: 'queued', page_id: response.page_id };
    },

    async search(body) {
      const response = await client.post<Schema<'SearchResponse'>>(
        '/v1/search',
        body
      );
      return {
        query_id: response.query_id,
        results: response.results.map(mapPageResult),
        timing_ms: response.timing_ms,
      };
    },
    async compare(body) {
      const response = await client.post<Schema<'CompareResponse'>>(
        '/v1/compare',
        body
      );
      return {
        query_id: response.compare_id,
        per_model: response.runs.map((run) => ({
          model: run.model,
          results: run.results.map((result) => ({ ...result, chunks: [] })),
        })),
        agreement: response.agreement,
      };
    },
    feedback: (body) => client.post('/v1/feedback', body),

    async listJobs(params) {
      const response = parse(
        jobListSchema,
        await client.get('/v1/jobs', params),
        'GET /v1/jobs'
      );
      return response.jobs;
    },
    retryJob: async (id) =>
      parse(
        jobSchema,
        await client.post(`/v1/jobs/${encodeURIComponent(id)}/retry`),
        'POST /v1/jobs/{job_id}/retry'
      ),

    async listClusters(includeTombstoned) {
      const response = await client.get<Schema<'ClusterListResponse'>>(
        '/v1/clusters',
        { include_tombstoned: includeTombstoned }
      );
      return response.clusters.map(mapCluster);
    },
    async getCluster(id) {
      const response = await client.get<Schema<'ClusterDetailResponse'>>(
        `/v1/clusters/${encodeURIComponent(id)}`
      );
      return mapCluster(response.cluster);
    },
    async clusterRuns() {
      const response =
        await client.get<Schema<'ClusterRunsResponse'>>('/v1/clusters/runs');
      return response.runs.map(mapClusterRun);
    },
    async projection(runId) {
      const response = await client.get<Schema<'ClusterProjectionResponse'>>(
        '/v1/clusters/projection',
        { run_id: runId }
      );
      return response.points;
    },
    recomputeClusters: async () =>
      parse(
        recomputeSchema,
        await client.post('/v1/clusters/recompute'),
        'POST /v1/clusters/recompute'
      ),

    async getEntity(ref) {
      const response = await client.get<Schema<'EntityDetailResponse'>>(
        `/v1/entities/${encodeURIComponent(ref)}`
      );
      return mapEntity(response.entity, response.aliases);
    },

    async listModels() {
      const response = parse(
        modelListSchema,
        await client.get('/v1/models'),
        'GET /v1/models'
      );
      return response.models.map(mapModel);
    },
    async registerModel(body) {
      return mapModel(
        parse(
          rawModelSchema,
          await client.post('/v1/models', body),
          'POST /v1/models'
        )
      );
    },
    backfillEstimate: async (id) =>
      parse(
        backfillEstimateSchema,
        await client.post(`/v1/models/${encodeURIComponent(id)}/backfill`, {
          confirm: false,
        }),
        'POST /v1/models/{model_id}/backfill'
      ),
    backfillStart: async (id) =>
      parse(
        backfillStartedSchema,
        await client.post(`/v1/models/${encodeURIComponent(id)}/backfill`, {
          confirm: true,
        }),
        'POST /v1/models/{model_id}/backfill'
      ),
    backfillProgress: (id) =>
      client.get(`/v1/models/${encodeURIComponent(id)}/backfill`),
    async activateModel(id) {
      return mapModel(
        parse(
          rawModelSchema,
          await client.post(`/v1/models/${encodeURIComponent(id)}/activate`),
          'POST /v1/models/{model_id}/activate'
        )
      );
    },
    retireModel: (id) => client.delete(`/v1/models/${encodeURIComponent(id)}`),

    async queryLog(params) {
      const response = await client.get<Schema<'QueryLogListResponse'>>(
        '/v1/admin/query-log',
        params
      );
      return response.runs.map(mapLoggedRun);
    },
    async queryLogDetail(id) {
      return mapQueryLogDetail(
        await client.get<RawLoggedRun>(
          `/v1/admin/query-log/${encodeURIComponent(id)}`
        )
      );
    },
    async evalScore(body) {
      return mapScoreReport(
        await client.post<RawScoreReport>('/v1/admin/eval/score', body)
      );
    },
    evalReplay: (body) => client.post('/v1/admin/eval/replay', body),
    evalReplayResult: (jobId) =>
      client.get(`/v1/admin/eval/replay/${encodeURIComponent(jobId)}`),

    metricsText: () => client.metricsText(),
    metricsTimeseries: (params) =>
      client.get('/v1/admin/metrics/timeseries', params),

    async config(): Promise<EffectiveConfig> {
      const response = await client.get<{
        settings: Record<string, unknown>;
        mutability: Record<string, string>;
      }>('/v1/admin/config');
      return {
        fields: configFields(response.settings, response.mutability),
      };
    },
    mcp: () => client.get<Schema<'McpAdminResponse'>>('/v1/admin/mcp'),
    async blacklist() {
      const response = parse(
        blacklistResponseSchema,
        await client.get('/v1/blacklist'),
        'GET /v1/blacklist'
      );
      return response.entries;
    },
    removeBlacklist: (id) =>
      client.delete(`/v1/blacklist/${encodeURIComponent(id)}`),
    forget: async (body) =>
      parse(
        forgetResponseSchema,
        await client.post('/v1/forget', body),
        'POST /v1/forget'
      ),
  };
}

export const refineryApi = createRefineryApi(httpClient);
