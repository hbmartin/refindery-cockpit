/* oxlint-disable @tanstack/query/exhaustive-deps -- the composed API is a stable process dependency, not query identity */
/**
 * Typed React Query hooks — one per refindery resource. Read hooks gate on a
 * present token and poll at the cadence the plan prescribes; mutation hooks
 * surface success/error toasts and invalidate the affected keys.
 */
import {
  queryOptions,
  useMutation,
  type UseMutationOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { POLL, refineryKeys } from './query-keys';
import { useRefinderyApi } from './refindery-client-context';
import { useHasToken } from './use-token';
import { isApiError } from '../domain/errors';

/** Queries are client-only: refindery is reached from the browser with the
 * stored token, so nothing should fetch during SSR (it would block dehydration). */
const isBrowser = typeof window !== 'undefined';

const errorMessage = (error: unknown): string =>
  isApiError(error)
    ? error.message
    : error instanceof Error
      ? error.message
      : 'Unexpected error';

// --- Reads -----------------------------------------------------------------

export function useWhoAmI() {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.whoami(),
      queryFn: () => refineryApi.whoami(),
      enabled,
      staleTime: POLL.slow,
      retry: false,
    })
  );
}

/** True when the stored token carries the `write` scope. */
export function useCanWrite(): boolean {
  const { data } = useWhoAmI();
  return data?.scopes?.includes('write') ?? false;
}

export function useReady() {
  const refineryApi = useRefinderyApi();
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.ready(),
      queryFn: () => refineryApi.ready(),
      enabled: isBrowser,
      refetchInterval: POLL.medium,
      retry: false,
    })
  );
}

/** Shared options for the `/metrics` text query so `useMetricsText` and
 * `useParsedMetrics` observe the same cache entry at the same cadence. */
export function useMetricsTextQueryOptions() {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return queryOptions({
    queryKey: refineryKeys.metricsText(),
    queryFn: () => refineryApi.metricsText(),
    enabled,
    refetchInterval: POLL.medium,
    retry: false,
  });
}

export function useMetricsText() {
  return useQuery(useMetricsTextQueryOptions());
}

export function useMetricsSeries(
  metric: string,
  since?: string,
  step?: string
) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.metricsSeries(metric, since, step),
      queryFn: () => refineryApi.metricsTimeseries({ metric, since, step }),
      enabled,
      refetchInterval: POLL.medium,
      retry: false,
    })
  );
}

export function useJobs(params?: {
  status?: 'pending' | 'running' | 'done' | 'failed' | 'dead';
  kind?: string;
  limit?: number;
}) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.jobs(params),
      queryFn: () => refineryApi.listJobs(params),
      enabled,
      refetchInterval: POLL.fast,
      retry: false,
    })
  );
}

export function useClusters(includeTombstoned?: boolean) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.clusters(includeTombstoned),
      queryFn: () => refineryApi.listClusters(includeTombstoned),
      enabled,
      refetchInterval: POLL.slow,
      retry: false,
    })
  );
}

export function useClusterRuns() {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.clusterRuns(),
      queryFn: () => refineryApi.clusterRuns(),
      enabled,
      staleTime: POLL.slow,
      retry: false,
    })
  );
}

export function useProjection(runId?: string) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.projection(runId),
      queryFn: () => refineryApi.projection(runId),
      enabled,
      staleTime: POLL.slow,
      retry: false,
    })
  );
}

export function useEntity(ref: string | undefined) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser && !!ref;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.entity(ref ?? ''),
      queryFn: () => refineryApi.getEntity(ref as string),
      enabled,
      retry: false,
    })
  );
}

export function useModels() {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.models(),
      queryFn: () => refineryApi.listModels(),
      enabled,
      refetchInterval: POLL.slow,
      retry: false,
    })
  );
}

export function useBackfillProgress(id: string | undefined, polling: boolean) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser && !!id;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.backfill(id ?? ''),
      queryFn: () => refineryApi.backfillProgress(id as string),
      enabled,
      refetchInterval: polling ? POLL.fast : false,
      retry: false,
    })
  );
}

export function useQueryLog(params?: {
  since?: string;
  limit?: number;
  kind?: string;
}) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.queryLog(params),
      queryFn: () => refineryApi.queryLog(params),
      enabled,
      staleTime: POLL.medium,
      retry: false,
    })
  );
}

export function useQueryLogDetail(id: string | undefined) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser && !!id;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.queryLogDetail(id ?? ''),
      queryFn: () => refineryApi.queryLogDetail(id as string),
      enabled,
      retry: false,
    })
  );
}

export function useConfig() {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.config(),
      queryFn: () => refineryApi.config(),
      enabled,
      staleTime: POLL.slow,
      retry: false,
    })
  );
}

export function useMcp() {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.mcp(),
      queryFn: () => refineryApi.mcp(),
      enabled,
      staleTime: POLL.slow,
      retry: false,
    })
  );
}

export function useBlacklist() {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.blacklist(),
      queryFn: () => refineryApi.blacklist(),
      enabled,
      staleTime: POLL.medium,
      retry: false,
    })
  );
}

export function usePage(id: string | undefined) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser && !!id;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.page(id ?? ''),
      queryFn: () => refineryApi.getPage(id as string),
      enabled,
      retry: false,
    })
  );
}

export function usePageChunks(id: string | undefined) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser && !!id;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.pageChunks(id ?? ''),
      queryFn: () => refineryApi.getPageChunks(id as string),
      enabled,
      retry: false,
    })
  );
}

export function usePageEntities(id: string | undefined) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser && !!id;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.pageEntities(id ?? ''),
      queryFn: () => refineryApi.getPageEntities(id as string),
      enabled,
      retry: false,
    })
  );
}

export function useSimilar(id: string | undefined, mediation?: string) {
  const refineryApi = useRefinderyApi();
  const enabled = useHasToken() && isBrowser && !!id;
  return useQuery(
    queryOptions({
      queryKey: refineryKeys.similar(id ?? '', mediation),
      queryFn: () => refineryApi.getSimilar(id as string, mediation),
      enabled,
      retry: false,
    })
  );
}

// --- Mutations -------------------------------------------------------------

type ToastCopy<TData, TVars> = {
  success: string | ((data: TData, vars: TVars) => string);
  invalidate?: readonly (readonly unknown[])[];
};

/** Wrap a mutation with success/error toasts and key invalidation. */
export function useApiMutation<TData, TVars = void>(
  mutationFn: (vars: TVars) => Promise<TData>,
  copy: ToastCopy<TData, TVars>,
  options?: UseMutationOptions<TData, unknown, TVars>
) {
  const queryClient = useQueryClient();
  return useMutation<TData, unknown, TVars>({
    mutationFn,
    ...options,
    onSuccess: (data, vars, onMutateResult, context) => {
      const message =
        typeof copy.success === 'function'
          ? copy.success(data, vars)
          : copy.success;
      toast.success(message);
      for (const key of copy.invalidate ?? []) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      options?.onSuccess?.(data, vars, onMutateResult, context);
    },
    onError: (error, vars, onMutateResult, context) => {
      toast.error(errorMessage(error));
      options?.onError?.(error, vars, onMutateResult, context);
    },
  });
}

export { errorMessage };
