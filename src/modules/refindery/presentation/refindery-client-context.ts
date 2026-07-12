import { createContext, use } from 'react';

import type { RefineryApi } from '../application/ports/refinery-api';
import type { SearchHistoryStore } from '../application/ports/search-history-store';
import type { TokenStore } from '../application/ports/token-store';

export type RefinderyClientDependencies = {
  api: RefineryApi;
  tokenStore: TokenStore;
  searchHistory: SearchHistoryStore;
};

export const RefinderyClientContext =
  createContext<RefinderyClientDependencies | null>(null);

function useRefinderyClientDependencies(): RefinderyClientDependencies {
  const dependencies = use(RefinderyClientContext);
  if (!dependencies) {
    throw new Error('RefinderyClientProvider is missing.');
  }
  return dependencies;
}

export function useRefinderyApi(): RefineryApi {
  return useRefinderyClientDependencies().api;
}

export function useRefinderyTokenStore(): TokenStore {
  return useRefinderyClientDependencies().tokenStore;
}

export function useRefinderySearchHistoryStore(): SearchHistoryStore {
  return useRefinderyClientDependencies().searchHistory;
}
