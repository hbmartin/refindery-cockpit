import { useSyncExternalStore } from 'react';

import { useRefinderySearchHistoryStore } from './refindery-client-context';
import type { SearchHistoryEntry } from '../application/ports/search-history-store';

/** Reactively read recent successful Search-Lab runs, newest first. SSR-safe. */
export function useSearchHistory(): readonly SearchHistoryEntry[] {
  const store = useRefinderySearchHistoryStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );
}

export function useRecordSearch(): (entry: SearchHistoryEntry) => void {
  return useRefinderySearchHistoryStore().record;
}

export function useClearSearchHistory(): () => void {
  return useRefinderySearchHistoryStore().clear;
}
