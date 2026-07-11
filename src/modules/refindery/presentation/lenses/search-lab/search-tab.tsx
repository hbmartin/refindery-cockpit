import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { SearchIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';
import { Input } from '@/platform/components/ui/input';

import { TimingBar } from './timing-bar';
import { errorMessage, refineryApi } from '../../../client';
import type { PageResult, SearchRequest, SearchResponse } from '../../../index';
import { QueryBoundary } from '../../components/query-boundary';
import { useApiMutation } from '../../hooks';

function ResultCard({
  result,
  queryId,
}: {
  result: PageResult;
  queryId: string;
}) {
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
  const [query, setQuery] = useState('');
  const [k, setK] = useState(10);
  const [candidates, setCandidates] = useState(100);
  const [rerank, setRerank] = useState(true);
  const [domain, setDomain] = useState('');

  const search = useMutation<SearchResponse, unknown, SearchRequest>({
    mutationFn: (body) => refineryApi.search(body),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const run = () => {
    if (!query.trim()) return;
    search.mutate({
      query: query.trim(),
      k,
      candidates,
      rerank,
      filters: domain.trim() ? { domain: domain.trim() } : undefined,
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
            <Input
              type="number"
              value={k}
              onChange={(e) => setK(Number(e.target.value) || 10)}
              className="h-7 w-16"
            />
          </label>
          <label className="flex items-center gap-1">
            candidates
            <Input
              type="number"
              value={candidates}
              onChange={(e) => setCandidates(Number(e.target.value) || 100)}
              className="h-7 w-20"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={rerank}
              onChange={(e) => setRerank(e.target.checked)}
            />
            rerank
          </label>
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
