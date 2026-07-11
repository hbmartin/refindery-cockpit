import { useEffect, useRef, useState } from 'react';

import { parsePrometheus, type PromMetrics } from '../../../client';
import type { SeriesPoint } from '../../components/charts';
import { useMetricsText } from '../../hooks';

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
  const query = useMetricsText();
  const historyRef = useRef<Map<string, SeriesPoint[]>>(new Map());
  const lastStampRef = useRef<string | undefined>(undefined);
  const [, forceRender] = useState(0);

  const parsed = query.data ? parsePrometheus(query.data) : undefined;

  useEffect(() => {
    if (!query.data || !parsed) return;
    if (query.dataUpdatedAt === 0) return;
    const stamp = String(query.dataUpdatedAt);
    if (stamp === lastStampRef.current) return;
    lastStampRef.current = stamp;

    const t = query.dataUpdatedAt;
    for (const [key, reducer] of Object.entries(selectors)) {
      const series = historyRef.current.get(key) ?? [];
      series.push({ t, value: reducer(parsed) });
      if (series.length > MAX_POINTS) series.shift();
      historyRef.current.set(key, series);
    }
    forceRender((n) => n + 1);
    // parsed is derived from query.data; keying on dataUpdatedAt covers refreshes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.dataUpdatedAt, query.data]);

  return {
    parsed,
    history: historyRef.current,
    updatedAt: query.dataUpdatedAt || undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
