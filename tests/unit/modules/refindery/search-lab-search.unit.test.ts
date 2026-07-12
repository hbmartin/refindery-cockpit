import { describe, expect, it } from 'vitest';

import {
  jobsSearchSchema,
  searchLabSearchDefaults,
  searchLabSearchSchema,
} from '@/modules/refindery/testing';

describe('searchLabSearchSchema', () => {
  it('fills defaults for an empty search object', () => {
    expect(searchLabSearchSchema.parse({})).toEqual(searchLabSearchDefaults);
  });

  it('round-trips a fully specified search', () => {
    const search = {
      tab: 'compare',
      query: 'postgres tuning',
      k: 25,
      candidates: 500,
      rerank: false,
      domain: 'example.com',
      models: 'model-a, model-b',
    };
    expect(searchLabSearchSchema.parse(search)).toEqual(search);
  });

  it('degrades mangled values to defaults instead of throwing', () => {
    expect(
      searchLabSearchSchema.parse({
        tab: 'nonsense',
        query: 42,
        k: 'many',
        candidates: -3,
        rerank: 'yes',
        domain: {},
        models: [],
      })
    ).toEqual(searchLabSearchDefaults);
  });

  it('clamps out-of-range numbers back to defaults via catch', () => {
    expect(searchLabSearchSchema.parse({ k: 0 }).k).toBe(10);
    expect(searchLabSearchSchema.parse({ k: 101 }).k).toBe(10);
    expect(searchLabSearchSchema.parse({ k: 3.5 }).k).toBe(10);
    expect(searchLabSearchSchema.parse({ candidates: 1001 }).candidates).toBe(
      100
    );
  });
});

describe('jobsSearchSchema', () => {
  it('accepts a valid status and defaults to none', () => {
    expect(jobsSearchSchema.parse({})).toEqual({ status: undefined });
    expect(jobsSearchSchema.parse({ status: 'dead' })).toEqual({
      status: 'dead',
    });
  });

  it('drops unknown statuses instead of throwing', () => {
    expect(jobsSearchSchema.parse({ status: 'zombie' })).toEqual({
      status: undefined,
    });
  });
});
