/**
 * Single bearer token persisted in `localStorage`. Localhost, single user:
 * stored in plaintext (surfaced to the user in Settings). SSR-safe — the server
 * snapshot is always `null` since there is no `localStorage`.
 */

const STORAGE_KEY = 'refindery.token';

const listeners = new Set<() => void>();

let cached: string | null = null;
let hydrated = false;

const read = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const ensureHydrated = () => {
  if (!hydrated) {
    cached = read();
    hydrated = true;
  }
};

export const tokenStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): string | null {
    ensureHydrated();
    return cached;
  },

  getServerSnapshot(): string | null {
    return null;
  },

  set(token: string | null): void {
    cached = token && token.trim() ? token.trim() : null;
    hydrated = true;
    if (typeof window !== 'undefined') {
      try {
        if (cached) {
          window.localStorage.setItem(STORAGE_KEY, cached);
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Ignore storage failures (private mode, quota); the in-memory value still applies.
      }
    }
    for (const listener of listeners) listener();
  },

  /** Synchronous read for request construction (outside React). */
  peek(): string | null {
    ensureHydrated();
    return cached;
  },
};
