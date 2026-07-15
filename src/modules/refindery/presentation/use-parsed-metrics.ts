import { useQuery } from '@tanstack/react-query';

import { useMetricsTextQueryOptions } from './hooks';
import { parsePrometheus, type PromMetrics } from '../domain/prometheus';

/** Module-scope select so React Query memoizes the parse per observer: the
 * exposition text parses at most once per refetch instead of per consumer
 * per render. */
const selectParsedMetrics = (text: string): PromMetrics =>
  parsePrometheus(text);

/** The `/metrics` query parsed into typed samples. Shares the cache entry
 * (and polling) with `useMetricsText`. */
export function useParsedMetrics() {
  const options = useMetricsTextQueryOptions();
  return useQuery({ ...options, select: selectParsedMetrics });
}
