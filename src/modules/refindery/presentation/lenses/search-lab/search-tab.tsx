import { useMutation } from '@tanstack/react-query';
import { getRouteApi, Link } from '@tanstack/react-router';
import { SearchIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';
import { Checkbox } from '@/platform/components/ui/checkbox';
import { Input } from '@/platform/components/ui/input';
import { NumberInput } from '@/platform/components/ui/number-input';

import { HistoryPanel } from './history-panel';
import { searchLabSearchDefaults } from './search-lab-search';
import { TimingBar } from './timing-bar';
import { useUrlSyncedDraft } from './use-url-synced-draft';
import type { PageResult, SearchRequest, SearchResponse } from '../../../index';
import { QueryBoundary } from '../../components/query-boundary';
import { errorMessage, useApiMutation } from '../../hooks';
import { useRefinderyApi } from '../../refindery-client-context';
import { useRecordSearch } from '../../use-search-history';
import { useHasToken } from '../../use-token';

const route = getRouteApi('/_shell/search');

type SearchRun = {
  query: string;
  k: number;
  candidates: number;
  rerank: boolean;
  domain: string;
};

const runSignature = (run: SearchRun): string =>
  JSON.stringify([run.query, run.k, run.candidates, run.rerank, run.domain]);

function ResultCard({
  result,
  queryId,
}: {
  result: PageResult;
  queryId: string;
}) {
  const refineryApi = useRefinderyApi();
  const feedback = useApiMutation(
    (relevant: boolean) =>
      refineryApi.feedback({
        query_id: queryId,
        page_id: result.page_id,
        relevant,
      }),
    { success: 'Feedback recorded' }
  );
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/pages/$pageId"
            params={{ pageId: result.page_id }}
            className="line-clamp-1 font-medium hover:underline"
          >
            {result.title || result.canonical_url}
          </Link>
          <div className="line-clamp-1 text-2xs text-muted-foreground">
            {result.canonical_url}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {result.exact_match ? (
            <Badge variant="positive" size="xs">
              exact
            </Badge>
          ) : null}
          {result.cluster ? (
            <Badge variant="secondary" size="xs">
              {result.cluster.label || result.cluster.cluster_id.slice(0, 6)}
            </Badge>
          ) : null}
          <Badge variant="secondary" size="sm" className="font-mono">
            {result.score.toFixed(3)}
          </Badge>
        </div>
      </div>
      {result.chunks[0] ? (
        <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
          {result.chunks[0].text}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-1">
        <Button
          size="icon-xs"
          variant="ghost"
          loading={feedback.isPending}
          onClick={() => feedback.mutate(true)}
          aria-label="Relevant"
        >
          <ThumbsUpIcon />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => feedback.mutate(false)}
          aria-label="Not relevant"
        >
          <ThumbsDownIcon />
        </Button>
      </div>
    </div>
  );
}

export function SearchTab() {
  const refineryApi = useRefinderyApi();
  const params = route.useSearch();
  const navigate = route.useNavigate();
  const hasToken = useHasToken();

  // Local drafts so typing never navigates; the URL is the source of truth
  // for executed runs. Each draft resyncs only from its own param so a
  // committed number never wipes an in-progress query draft.
  const [query, setQuery] = useUrlSyncedDraft(params.query);
  const [domain, setDomain] = useUrlSyncedDraft(params.domain);
  const [k, setK] = useUrlSyncedDraft<number | null>(params.k);
  const [candidates, setCandidates] = useUrlSyncedDraft<number | null>(
    params.candidates
  );

  const recordSearch = useRecordSearch();
  const search = useMutation<SearchResponse, unknown, SearchRequest>({
    mutationFn: (body) => refineryApi.search(body),
    onSuccess: (_data, variables) => {
      // Only successful executions enter history; replays bump recency via dedup.
      recordSearch({
        query: variables.query,
        k: variables.k ?? searchLabSearchDefaults.k,
        candidates: variables.candidates ?? searchLabSearchDefaults.candidates,
        rerank: variables.rerank ?? searchLabSearchDefaults.rerank,
        domain: variables.filters?.domain ?? '',
        executedAt: new Date().toISOString(),
      });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const lastRun = useRef<string | null>(null);
  const execute = (next: SearchRun) => {
    lastRun.current = runSignature(next);
    search.mutate({
      query: next.query,
      k: next.k,
      candidates: next.candidates,
      rerank: next.rerank,
      filters: next.domain ? { domain: next.domain } : undefined,
    });
  };

  // Auto-run whenever the URL carries a new runnable search: one mechanism
  // serves direct runs, deep links, history replay, and the command palette.
  useEffect(() => {
    if (!hasToken || !params.query.trim()) return;
    if (lastRun.current === runSignature(params)) return;
    execute(params);
    // Runs key on the URL params; execute/search identities are per-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasToken,
    params.query,
    params.k,
    params.candidates,
    params.rerank,
    params.domain,
  ]);

  const run = () => {
    const next: SearchRun = {
      query: query.trim(),
      domain: domain.trim(),
      k: k ?? searchLabSearchDefaults.k,
      candidates: candidates ?? searchLabSearchDefaults.candidates,
      rerank: params.rerank,
    };
    if (!next.query) return;
    if (lastRun.current === runSignature(next)) {
      // Same params as the last run: the URL won't change, so re-issue directly.
      execute(next);
      return;
    }
    void navigate({ search: (prev) => ({ ...prev, ...next }) });
  };

  // Numbers commit on blur (Enter also blurs), never mid-typing.
  const commitNumbers = () => {
    void navigate({
      search: (prev) => ({
        ...prev,
        k: k ?? searchLabSearchDefaults.k,
        candidates: candidates ?? searchLabSearchDefaults.candidates,
      }),
      replace: true,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') run();
            }}
            placeholder="Search your reading history…"
            className="flex-1"
          />
          <Button
            onClick={run}
            loading={search.isPending}
            disabled={!query.trim()}
          >
            <SearchIcon /> Search
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-1">
            k
            <NumberInput
              size="sm"
              min={1}
              step={1}
              value={k}
              onValueChange={(value) => setK(value)}
              onBlur={commitNumbers}
              className="w-16"
            />
          </label>
          <label className="flex items-center gap-1">
            candidates
            <NumberInput
              size="sm"
              min={1}
              step={1}
              value={candidates}
              onValueChange={(value) => setCandidates(value)}
              onBlur={commitNumbers}
              className="w-20"
            />
          </label>
          <Checkbox
            size="sm"
            checked={params.rerank}
            onCheckedChange={(checked) =>
              navigate({
                search: (prev) => ({ ...prev, rerank: checked === true }),
                replace: true,
              })
            }
            labelProps={{ className: 'items-center' }}
          >
            rerank
          </Checkbox>
          <label className="flex items-center gap-1">
            domain
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="any"
              className="h-7 w-36"
            />
          </label>
        </div>
      </div>

      <HistoryPanel />

      {search.data?.timing_ms ? (
        <div className="rounded-lg border border-border/60 bg-card/40 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Stage timing · query {search.data.query_id.slice(0, 8)}
          </div>
          <TimingBar timing={search.data.timing_ms} />
        </div>
      ) : null}

      {search.isIdle ? (
        <p className="text-sm text-muted-foreground">
          Run a query to inspect ranked results, provenance, and per-stage
          timing.
        </p>
      ) : (
        <QueryBoundary
          isLoading={search.isPending}
          isError={search.isError}
          error={search.error}
          isEmpty={(search.data?.results.length ?? 0) === 0}
          emptyLabel="No results for this query."
        >
          <div className="flex flex-col gap-2">
            {(search.data?.results ?? []).map((result) => (
              <ResultCard
                key={result.page_id}
                result={result}
                queryId={search.data?.query_id ?? ''}
              />
            ))}
          </div>
        </QueryBoundary>
      )}
    </div>
  );
}
