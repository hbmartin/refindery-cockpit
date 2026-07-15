import { useSyncExternalStore } from 'react';

import { useRefinderyTokenStore } from './refindery-client-context';

/** Reactively read the stored bearer token (null when unset). SSR-safe. */
export function useToken(): string | null {
  const tokenStore = useRefinderyTokenStore();
  return useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getSnapshot,
    tokenStore.getServerSnapshot
  );
}

export function useSetToken(): (token: string | null) => void {
  return useRefinderyTokenStore().set;
}

export function useHasToken(): boolean {
  return useToken() !== null;
}
