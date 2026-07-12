import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SearchHistoryEntry } from '@/modules/refindery/testing';

const STORAGE_KEY = 'refindery.search-history';

const entry = (
  query: string,
  overrides: Partial<SearchHistoryEntry> = {}
): SearchHistoryEntry => ({
  query,
  k: 10,
  candidates: 100,
  rerank: true,
  domain: '',
  executedAt: '2026-07-12T00:00:00Z',
  ...overrides,
});

const createFakeStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
};

/** The store hydrates lazily into module-level state, so each test re-imports
 * a fresh module instance against its own stubbed `window.localStorage`. */
const loadStore = async (storage: ReturnType<typeof createFakeStorage>) => {
  vi.stubGlobal('window', { localStorage: storage });
  const { searchHistoryStore, SEARCH_HISTORY_LIMIT } =
    await import('@/modules/refindery/testing');
  return { store: searchHistoryStore, limit: SEARCH_HISTORY_LIMIT };
};

describe('searchHistoryStore', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('records newest-first and caps the list', async () => {
    const { store, limit } = await loadStore(createFakeStorage());
    for (let i = 0; i < limit + 5; i += 1) {
      store.record(entry(`query-${i}`));
    }
    const snapshot = store.getSnapshot();
    expect(snapshot).toHaveLength(limit);
    expect(snapshot[0]?.query).toBe(`query-${limit + 4}`);
  });

  it('dedups identical params and bumps the entry to the top', async () => {
    const { store } = await loadStore(createFakeStorage());
    store.record(entry('alpha'));
    store.record(entry('beta'));
    store.record(entry('alpha', { executedAt: '2026-07-12T01:00:00Z' }));
    const snapshot = store.getSnapshot();
    expect(snapshot.map((e) => e.query)).toEqual(['alpha', 'beta']);
    expect(snapshot[0]?.executedAt).toBe('2026-07-12T01:00:00Z');
  });

  it('treats different params for the same query as distinct entries', async () => {
    const { store } = await loadStore(createFakeStorage());
    store.record(entry('alpha'));
    store.record(entry('alpha', { k: 25 }));
    expect(store.getSnapshot()).toHaveLength(2);
  });

  it('round-trips through localStorage', async () => {
    const storage = createFakeStorage();
    const first = await loadStore(storage);
    first.store.record(entry('persisted'));

    vi.resetModules();
    const second = await loadStore(storage);
    expect(second.store.getSnapshot().map((e) => e.query)).toEqual([
      'persisted',
    ]);
  });

  it('tolerates corrupt and wrong-shaped stored JSON', async () => {
    const corrupt = await loadStore(
      createFakeStorage({ [STORAGE_KEY]: 'not-json' })
    );
    expect(corrupt.store.getSnapshot()).toEqual([]);

    vi.resetModules();
    const wrongShape = await loadStore(
      createFakeStorage({
        [STORAGE_KEY]: JSON.stringify([{ query: 1 }, entry('valid')]),
      })
    );
    expect(wrongShape.store.getSnapshot().map((e) => e.query)).toEqual([
      'valid',
    ]);
  });

  it('keeps getSnapshot and getServerSnapshot referentially stable', async () => {
    const { store } = await loadStore(createFakeStorage());
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
    store.record(entry('alpha'));
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it('clears both memory and storage and notifies subscribers', async () => {
    const storage = createFakeStorage();
    const { store } = await loadStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.record(entry('alpha'));
    store.clear();
    expect(store.getSnapshot()).toEqual([]);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('still works in memory when storage throws', async () => {
    const storage = createFakeStorage();
    storage.setItem = () => {
      throw new Error('quota exceeded');
    };
    const { store } = await loadStore(storage);
    store.record(entry('alpha'));
    expect(store.getSnapshot().map((e) => e.query)).toEqual(['alpha']);
  });
});
