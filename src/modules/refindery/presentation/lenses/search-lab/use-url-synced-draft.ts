import { useState } from 'react';

/**
 * Local draft state that resyncs whenever its URL-derived value changes
 * (back/forward, history replay, palette navigation) without wiping
 * in-progress edits when unrelated params move. Uses the render-time
 * "adjust state when props change" pattern rather than an effect.
 */
export function useUrlSyncedDraft<T>(urlValue: T) {
  const [draft, setDraft] = useState(urlValue);
  const [prevUrlValue, setPrevUrlValue] = useState(urlValue);
  if (prevUrlValue !== urlValue) {
    setPrevUrlValue(urlValue);
    setDraft(urlValue);
  }
  return [draft, setDraft] as const;
}
