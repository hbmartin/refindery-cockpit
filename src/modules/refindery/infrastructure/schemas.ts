/**
 * Runtime response validation for the highest-blast-radius endpoints: whoami
 * (drives write gating — fails closed), jobs (drives alerts and retry), and
 * the mutation-driving reads. Not every operation is validated — additive
 * backend fields are stripped by `z.object`, and structural drift is caught at
 * build time by `pnpm gen:api:check`; these schemas catch a live backend whose
 * 2xx bodies no longer match the committed contract.
 *
 * Every schema `satisfies z.ZodType<wire type>` so schema-vs-generated-types
 * drift is itself a compile error.
 */
import { z } from 'zod';

import type { components } from '../domain/api.gen';
import type { ReadyStatus } from '../domain/api-types';

type Schema<Name extends keyof components['schemas']> =
  components['schemas'][Name];

export const whoAmISchema = z.object({
  name: z.string(),
  scopes: z.array(z.string()),
}) satisfies z.ZodType<Schema<'WhoAmIResponse'>>;

/** `/readyz` is `additionalProperties: true` in OpenAPI; validate the curated
 * shape the cockpit relies on. */
export const readySchema = z.object({
  status: z.string(),
  checks: z.record(z.string(), z.boolean()).optional(),
  active_model: z.string().nullable().optional(),
}) satisfies z.ZodType<ReadyStatus>;

export const jobSchema = z.object({
  job_id: z.string(),
  kind: z.string(),
  status: z.enum(['pending', 'running', 'done', 'failed', 'dead']),
  attempts: z.number(),
  max_attempts: z.number(),
  last_error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
}) satisfies z.ZodType<Schema<'JobResponse'>>;

export const jobListSchema = z.object({
  jobs: z.array(jobSchema),
}) satisfies z.ZodType<Schema<'JobListResponse'>>;

/** Revisit branch first: `z.object` strips unknown keys, so the accepted
 * branch would silently swallow `revisit` if tried first. */
export const ingestResponseSchema = z.union([
  z.object({
    page_id: z.string(),
    status: z.enum(['queued', 'indexing', 'indexed', 'failed', 'dead']),
    revisit: z.literal(true),
    content_hash_differs: z.boolean().optional(),
  }),
  z.object({
    page_id: z.string(),
    status: z.literal('queued').optional(),
  }),
]) satisfies z.ZodType<
  Schema<'IngestRevisitResponse'> | Schema<'IngestAcceptedResponse'>
>;

export const rawModelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  model_name: z.string(),
  dim: z.number(),
  max_input_tokens: z.number(),
  is_active: z.boolean(),
  status: z.string(),
}) satisfies z.ZodType<Schema<'ModelInfo'>>;

export const modelListSchema = z.object({
  models: z.array(rawModelSchema),
}) satisfies z.ZodType<Schema<'ModelListResponse'>>;

export const backfillEstimateSchema = z.object({
  model_id: z.string(),
  n_chunks: z.number(),
  total_tokens: z.number(),
  est_cost_usd: z.number().nullable(),
  est_duration_s: z.number().nullable(),
  confirm_required: z.literal(true).optional(),
}) satisfies z.ZodType<Schema<'BackfillEstimateResponse'>>;

export const backfillStartedSchema = z.object({
  model_id: z.string(),
  status: z.literal('backfilling').optional(),
}) satisfies z.ZodType<Schema<'BackfillStartedResponse'>>;

export const recomputeSchema = z.object({
  accepted: z.boolean(),
  detail: z.string().nullable(),
}) satisfies z.ZodType<Schema<'RecomputeResponse'>>;

export const forgetResponseSchema = z.object({
  blacklist_id: z.string(),
  pattern: z.string(),
  kind: z.enum(['url', 'domain']),
  pages_purged: z.number(),
  vector_deletes_queued: z.number(),
}) satisfies z.ZodType<Schema<'ForgetResponse'>>;

export const blacklistResponseSchema = z.object({
  entries: z.array(
    z.object({
      id: z.string(),
      pattern: z.string(),
      kind: z.enum(['url', 'domain']),
      reason: z.string().nullable(),
      created_at: z.string(),
    })
  ),
}) satisfies z.ZodType<Schema<'BlacklistResponse'>>;
