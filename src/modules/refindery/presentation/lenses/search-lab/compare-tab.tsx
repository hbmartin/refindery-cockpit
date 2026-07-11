import { useMutation } from '@tanstack/react-query';
import { GitCompareIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';
import { Input } from '@/platform/components/ui/input';

import { errorMessage, refineryApi } from '../../../client';
import type { CompareRequest, CompareResponse } from '../../../index';
import { QueryBoundary } from '../../components/query-boundary';

const pct = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(2));

export function CompareTab() {
  const [query, setQuery] = useState('');
  const [models, setModels] = useState('');

  const compare = useMutation<CompareResponse, unknown, CompareRequest>({
    mutationFn: (body) => refineryApi.compare(body),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const run = () => {
    const list = models
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    if (!query.trim() || list.length < 2) {
      toast.error('Enter a query and at least two model ids');
      return;
    }
    compare.mutate({ query: query.trim(), models: list });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query"
          className="flex-1"
        />
        <Input
          value={models}
          onChange={(e) => setModels(e.target.value)}
          placeholder="model-a, model-b (2–5)"
          className="flex-1"
        />
        <Button onClick={run} loading={compare.isPending}>
          <GitCompareIcon /> Compare
        </Button>
      </div>

      {compare.isIdle ? (
        <p className="text-sm text-muted-foreground">
          Compare 2–5 embedding models on the same query. Agreement is measured
          with Jaccard@k, RBO, and Kendall&apos;s τ.
        </p>
      ) : (
        <QueryBoundary
          isLoading={compare.isPending}
          isError={compare.isError}
          error={compare.error}
        >
          {compare.data ? (
            <div className="flex flex-col gap-4">
              {compare.data.agreement.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                        <th className="px-3 py-2 text-left">Pair</th>
                        <th className="px-3 py-2 text-right">Jaccard@k</th>
                        <th className="px-3 py-2 text-right">RBO</th>
                        <th className="px-3 py-2 text-right">Kendall τ</th>
                        <th className="px-3 py-2 text-right">∩ size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compare.data.agreement.map((a) => (
                        <tr
                          key={`${a.model_a}-${a.model_b}`}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="px-3 py-1.5 font-mono text-2xs">
                            {a.model_a} ↔ {a.model_b}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {pct(a.jaccard_at_k)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {pct(a.rbo)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {pct(a.kendall_tau)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">
                            {a.intersection_size ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {compare.data.per_model.map((column) => (
                  <div
                    key={column.model}
                    className="rounded-lg border border-border/60 p-2"
                  >
                    <div className="mb-1 flex items-center gap-2 px-1">
                      <Badge
                        variant="secondary"
                        size="sm"
                        className="font-mono"
                      >
                        {column.model}
                      </Badge>
                    </div>
                    <ol className="flex flex-col gap-1">
                      {column.results.map((r, i) => (
                        <li
                          key={r.page_id}
                          className="flex items-baseline gap-2 px-1 text-xs"
                        >
                          <span className="w-4 text-right font-mono text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="line-clamp-1 flex-1">
                            {r.title || r.canonical_url}
                          </span>
                          <span className="font-mono text-2xs text-muted-foreground">
                            {r.score.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </QueryBoundary>
      )}
    </div>
  );
}
