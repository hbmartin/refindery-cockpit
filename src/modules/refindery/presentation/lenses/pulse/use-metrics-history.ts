import { useEffect, useRef, useState } from 'react';

import type { PromMetrics } from '../../../domain/prometheus';
import type { SeriesPoint } from '../../components/charts';
import { useParsedMetrics } from '../../use-parsed-metrics';

const MAX_POINTS = 120;

export type MetricsSnapshot = {
  parsed: PromMetrics | undefined;
  history: Map<string, SeriesPoint[]>;
  updatedAt: number | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

/**
 * Polls instantaneous `/metrics` and accumulates a bounded client-side history
 * so Pulse can draw live time-series even before the backend `metrics_samples`
 * table (Ask M1/M2) exists. `selectors` map a display key to a scalar reducer.
 */
export function useMetricsHistory(
  selectors: Record<string, (m: PromMetrics) => number>
): MetricsSnapshot {
  const query = useParsedMetrics();
  const [history, setHistory] = useState<Map<string, SeriesPoint[]>>(
    () => new Map()
  );
  const lastStampRef = useRef<string | undefined>(undefined);

  const parsed = query.data;

  useEffect(() => {
    if (!query.data || !parsed) return;
    if (query.dataUpdatedAt === 0) return;
    const stamp = String(query.dataUpdatedAt);
    if (stamp === lastStampRef.current) return;
    lastStampRef.current = stamp;

    const t = query.dataUpdatedAt;
    setHistory((current) => {
      const next = new Map(current);
      for (const [key, reducer] of Object.entries(selectors)) {
        const series = [
          ...(next.get(key) ?? []),
          { t, value: reducer(parsed) },
        ];
        next.set(key, series.slice(-MAX_POINTS));
      }
      return next;
    });
    // parsed is derived from query.data; keying on dataUpdatedAt covers refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.dataUpdatedAt, query.data]);

  return {
    parsed,
    history,
    updatedAt: query.dataUpdatedAt || undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
