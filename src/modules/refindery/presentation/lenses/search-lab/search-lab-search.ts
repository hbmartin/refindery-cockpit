import { z } from 'zod';

/**
 * Search-Lab lens state lives in the URL so runs are deep-linkable, shareable,
 * and replayable from history. Invalid or missing params degrade to defaults
 * (`.default` for absent keys, `.catch` for mangled values) instead of
 * rendering the route error component.
 */
export const searchLabSearchDefaults = {
  tab: 'search',
  query: '',
  k: 10,
  candidates: 100,
  rerank: true,
  domain: '',
  models: '',
} as const;

export const searchLabSearchSchema = z.object({
  tab: z.enum(['search', 'compare', 'eval']).default('search').catch('search'),
  query: z.string().default('').catch(''),
  k: z.number().int().min(1).max(100).default(10).catch(10),
  candidates: z.number().int().min(1).max(1000).default(100).catch(100),
  rerank: z.boolean().default(true).catch(true),
  domain: z.string().default('').catch(''),
  /** Compare tab: comma-separated model ids, kept as typed. */
  models: z.string().default('').catch(''),
});

export type SearchLabSearch = z.output<typeof searchLabSearchSchema>;
