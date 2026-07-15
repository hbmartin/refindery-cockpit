import { describe, expect, it } from 'vitest';

import { filterActions, type PaletteAction } from '@/modules/refindery/testing';

const action = (
  id: string,
  label: string,
  keywords?: string
): PaletteAction => ({
  id,
  group: 'Navigate',
  label,
  keywords,
  run: () => undefined,
});

const ACTIONS = [
  action('pulse', 'Pulse', '/'),
  action('jobs', 'Jobs', '/jobs'),
  action('search', 'Search Lab', '/search'),
  action('retry', 'Retry job deadbeef · embed', 'deadbeef-1234'),
];

describe('filterActions', () => {
  it('returns every action for empty or whitespace input', () => {
    expect(filterActions(ACTIONS, '')).toHaveLength(ACTIONS.length);
    expect(filterActions(ACTIONS, '   ')).toHaveLength(ACTIONS.length);
  });

  it('matches labels case-insensitively', () => {
    expect(filterActions(ACTIONS, 'SEARCH').map((a) => a.id)).toEqual([
      'search',
    ]);
  });

  it('matches keywords invisible in the label', () => {
    expect(filterActions(ACTIONS, 'deadbeef-1234').map((a) => a.id)).toEqual([
      'retry',
    ]);
  });

  it('matches substrings anywhere, preserving order', () => {
    expect(filterActions(ACTIONS, 'job').map((a) => a.id)).toEqual([
      'jobs',
      'retry',
    ]);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterActions(ACTIONS, 'zzz')).toEqual([]);
  });
});
