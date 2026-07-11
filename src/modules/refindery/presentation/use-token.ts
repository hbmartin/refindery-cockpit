import { useSyncExternalStore } from 'react';

import { tokenStore } from '../infrastructure/token-store';

/** Reactively read the stored bearer token (null when unset). SSR-safe. */
export function useToken(): string | null {
  return useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getSnapshot,
    tokenStore.getServerSnapshot
  );
}

export function setToken(token: string | null): void {
  tokenStore.set(token);
}

export function useHasToken(): boolean {
  return useToken() !== null;
}
