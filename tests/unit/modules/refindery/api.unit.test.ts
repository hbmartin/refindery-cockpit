import { describe, expect, it } from 'vitest';

import { isApiError } from '@/modules/refindery';
import {
  createRefineryApi,
  type RefineryHttpClient,
} from '@/modules/refindery/testing';

type RecordedCall = { method: string; path: string; body?: unknown };

const createClient = (responses: Record<string, unknown>) => {
  const calls: RecordedCall[] = [];
  const client: RefineryHttpClient = {
    async get<T>(path: string): Promise<T> {
      calls.push({ method: 'GET', path });
      return responses[path] as T;
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      calls.push({ method: 'POST', path, body });
      return responses[path] as T;
    },
    async delete<T>(path: string): Promise<T> {
      calls.push({ method: 'DELETE', path });
      return responses[path] as T;
    },
    async metricsText() {
      return '# metrics';
    },
  };
  return { api: createRefineryApi(client), calls };
};

describe('refindery API adapter', () => {
  it('unwraps collection envelopes and maps backend field names', async () => {
    const doneJob = {
      job_id: 'job-1',
      kind: 'embed',
      status: 'done',
      attempts: 1,
      max_attempts: 3,
      last_error: null,
      created_at: '2026-07-11T00:00:00Z',
      updated_at: '2026-07-11T00:01:00Z',
    };
    const { api } = createClient({
      '/v1/jobs': { jobs: [doneJob] },
      '/v1/clusters': {
        clusters: [{ id: 'cluster-1', keywords: ['db'], size: 2 }],
      },
      '/v1/models': {
        models: [
          {
            id: 'model-1',
            provider: 'openai',
            model_name: 'embedding',
            dim: 1536,
            max_input_tokens: 8192,
            is_active: true,
            status: 'ready',
          },
        ],
      },
      '/v1/blacklist': {
        entries: [
          {
            id: 'rule-1',
            pattern: 'example.com',
            kind: 'domain',
            reason: null,
            created_at: '2026-07-11T00:00:00Z',
          },
        ],
      },
    });

    await expect(api.listJobs()).resolves.toEqual([doneJob]);
    await expect(api.listClusters()).resolves.toEqual([
      expect.objectContaining({ cluster_id: 'cluster-1', size: 2 }),
    ]);
    await expect(api.listModels()).resolves.toEqual([
      expect.objectContaining({
        model_id: 'model-1',
        dimensions: 1536,
        active: true,
      }),
    ]);
    await expect(api.blacklist()).resolves.toEqual([
      expect.objectContaining({ id: 'rule-1', pattern: 'example.com' }),
    ]);
  });

  it('rejects malformed 2xx bodies with a contract error', async () => {
    const { api } = createClient({
      '/v1/whoami': { name: 'admin' }, // missing scopes
      '/v1/jobs': { jobs: [{ job_id: 'job-1', attempts: 'three' }] },
    });

    for (const call of [api.whoami(), api.listJobs()]) {
      const error: unknown = await call.then(
        () => null,
        (thrown: unknown) => thrown
      );
      expect(isApiError(error) && error.kind).toBe('contract');
      expect(isApiError(error) && error.fields?.length).toBeTruthy();
    }
  });

  it('unwraps page-related envelopes', async () => {
    const { api } = createClient({
      '/v1/pages/page-1/chunks': {
        chunks: [
          {
            chunk_id: 'chunk-1',
            ordinal: 0,
            text: 'hello',
            token_count: 1,
            char_start: 4,
            char_end: 9,
          },
        ],
      },
      '/v1/pages/page-1/entities': {
        entities: [
          {
            id: 'entity-1',
            canonical_form: 'PostgreSQL',
            type: 'TECHNOLOGY',
            mention_count: 2,
            page_count: 1,
            idf: 0.5,
          },
        ],
      },
      '/v1/pages/page-1/similar': {
        results: [
          {
            page_id: 'page-2',
            canonical_url: 'https://example.com/2',
            title: 'Two',
            score: 0.8,
          },
        ],
      },
    });

    await expect(api.getPageChunks('page-1')).resolves.toEqual([
      expect.objectContaining({ body_start: 4, body_end: 9 }),
    ]);
    await expect(api.getPageEntities('page-1')).resolves.toEqual([
      expect.objectContaining({ entity_id: 'entity-1' }),
    ]);
    await expect(api.getSimilar('page-1')).resolves.toEqual([
      expect.objectContaining({ page_id: 'page-2', chunks: [] }),
    ]);
  });

  it('maps compare, query-log, score, and config responses for the UI', async () => {
    const loggedRun = {
      query_id: 'query-1',
      ts: '2026-07-11T00:00:00Z',
      kind: 'search',
      query_text: 'database',
      candidate_set: [],
      dense_hits: [],
      sparse_hits: [],
      final_pages: [{ page_id: 'page-1', score: 0.9, rank: 1 }],
      timing_ms: { total: 12 },
      feedback: { 'page-1': true },
    };
    const { api } = createClient({
      '/v1/compare': {
        compare_id: 'compare-1',
        runs: [
          {
            model: 'model-1',
            results: [
              {
                page_id: 'page-1',
                canonical_url: 'https://example.com',
                score: 0.9,
              },
            ],
          },
        ],
        agreement: [],
      },
      '/v1/admin/query-log': { runs: [loggedRun] },
      '/v1/admin/eval/score': {
        k: 10,
        scored: 1,
        models: [
          {
            model: 'model-1',
            ndcg: 1,
            reciprocal_rank: 0.5,
            recall: 0.75,
            recall_candidates: 1,
            rerank_lift: null,
          },
        ],
      },
      '/v1/admin/config': {
        settings: { search: { candidates: 100 }, debug: false },
        mutability: {
          'search.candidates': 'boot_only',
          debug: 'boot_only',
        },
      },
    });

    await expect(
      api.compare({ query: 'database', models: ['a', 'b'] })
    ).resolves.toMatchObject({
      query_id: 'compare-1',
      per_model: [{ model: 'model-1', results: [{ chunks: [] }] }],
    });
    await expect(api.queryLog()).resolves.toEqual([
      expect.objectContaining({
        query: 'database',
        n_results: 1,
        timing_ms: 12,
      }),
    ]);
    await expect(api.evalScore({ k: 10 })).resolves.toMatchObject({
      n_queries: 1,
      per_model: [{ model: 'model-1', mrr: 0.5 }],
    });
    await expect(api.config()).resolves.toEqual({
      fields: [
        {
          key: 'search.candidates',
          value: 100,
          boot_only: true,
          group: 'search',
        },
        { key: 'debug', value: false, boot_only: true, group: 'debug' },
      ],
    });
  });

  it('translates the cockpit ingest field to the backend url field', async () => {
    const { api, calls } = createClient({
      '/v1/pages': { page_id: 'page-1', status: 'queued' },
    });

    await expect(
      api.ingestPage({
        canonical_url: 'https://example.com',
        body_extracted: 'body',
      })
    ).resolves.toEqual({ outcome: 'queued', page_id: 'page-1' });
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/v1/pages',
      body: {
        url: 'https://example.com',
        title: undefined,
        body_extracted: 'body',
        body_html: undefined,
      },
    });
  });
});
