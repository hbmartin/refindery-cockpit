import type { ReactNode } from 'react';

import {
  RefinderyClientContext,
  type RefinderyClientDependencies,
} from './refindery-client-context';

export function RefinderyClientProvider({
  api,
  children,
  searchHistory,
  tokenStore,
}: RefinderyClientDependencies & { children: ReactNode }) {
  return (
    <RefinderyClientContext value={{ api, searchHistory, tokenStore }}>
      {children}
    </RefinderyClientContext>
  );
}
