/**
 * Recent successful Search-Lab runs persisted in `localStorage`, newest first,
 * deduped by parameter signature and capped. SSR-safe — the server snapshot is
 * always the shared empty list.
 */
import type {
  SearchHistoryEntry,
  SearchHistoryStore,
} from '../application/ports/search-history-store';

const STORAGE_KEY = 'refindery.search-history';

export const SEARCH_HISTORY_LIMIT = 20;

const EMPTY: readonly SearchHistoryEntry[] = [];

const listeners = new Set<() => void>();

let cached: readonly SearchHistoryEntry[] = EMPTY;
let hydrated = false;

const isEntry = (value: unknown): value is SearchHistoryEntry => {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.query === 'string' &&
    typeof entry.k === 'number' &&
    typeof entry.candidates === 'number' &&
    typeof entry.rerank === 'boolean' &&
    typeof entry.domain === 'string' &&
    typeof entry.executedAt === 'string'
  );
};

const read = (): readonly SearchHistoryEntry[] => {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(isEntry).slice(0, SEARCH_HISTORY_LIMIT);
  } catch {
    return EMPTY;
  }
};

const ensureHydrated = () => {
  if (!hydrated) {
    cached = read();
    hydrated = true;
  }
};

const persist = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Ignore storage failures (private mode, quota); the in-memory list still applies.
  }
};

const notify = () => {
  for (const listener of listeners) listener();
};

const signature = (entry: SearchHistoryEntry): string =>
  JSON.stringify([
    entry.query,
    entry.k,
    entry.candidates,
    entry.rerank,
    entry.domain,
  ]);

export const searchHistoryStore: SearchHistoryStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): readonly SearchHistoryEntry[] {
    ensureHydrated();
    return cached;
  },

  getServerSnapshot(): readonly SearchHistoryEntry[] {
    return EMPTY;
  },

  record(entry: SearchHistoryEntry): void {
    ensureHydrated();
    const key = signature(entry);
    cached = [
      entry,
      ...cached.filter((existing) => signature(existing) !== key),
    ].slice(0, SEARCH_HISTORY_LIMIT);
    persist();
    notify();
  },

  clear(): void {
    cached = EMPTY;
    hydrated = true;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage failures; the in-memory list is already cleared.
      }
    }
    notify();
  },
};
