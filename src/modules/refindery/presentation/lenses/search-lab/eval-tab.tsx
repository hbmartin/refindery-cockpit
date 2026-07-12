import { useMutation } from '@tanstack/react-query';
import { PlayIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/platform/components/ui/button';
import { NumberInput } from '@/platform/components/ui/number-input';

import type { LoggedRun, ScoreReport } from '../../../index';
import { Column, DataTable } from '../../components/data-table';
import { LensSection } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { errorMessage, useQueryLog } from '../../hooks';
import { useRefinderyApi } from '../../refindery-client-context';

const num = (v: number | undefined) => (v === undefined ? '—' : v.toFixed(3));

function QueryLogExplorer() {
  const { data, isLoading, isError, error } = useQueryLog({ limit: 100 });
  const rows = data ?? [];

  const columns: Column<LoggedRun>[] = [
    {
      key: 'query',
      header: 'Query',
      cell: (r) => <span className="line-clamp-1">{r.query}</span>,
    },
    { key: 'kind', header: 'Kind', cell: (r) => r.kind ?? '—' },
    { key: 'n', header: 'Results', cell: (r) => r.n_results, align: 'right' },
    {
      key: 'timing',
      header: 'ms',
      align: 'right',
      cell: (r) => (r.timing_ms != null ? r.timing_ms.toFixed(0) : '—'),
    },
    {
      key: 'fb',
      header: 'Feedback',
      align: 'right',
      cell: (r) => r.feedback?.length ?? 0,
    },
  ];

  return (
    <LensSection title="Query log">
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={rows.length === 0}
        emptyLabel="No logged queries yet."
      >
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.query_id} />
      </QueryBoundary>
    </LensSection>
  );
}

function ScoreRunner() {
  const refineryApi = useRefinderyApi();
  const [k, setK] = useState<number | null>(10);
  const score = useMutation<ScoreReport, unknown, void>({
    mutationFn: () => refineryApi.evalScore({ k: k ?? 10 }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <LensSection title="Offline score (nDCG / MRR / recall)">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          k
          <NumberInput
            size="sm"
            min={1}
            step={1}
            value={k}
            onValueChange={(value) => setK(value)}
            className="w-16"
          />
        </label>
        <Button
          size="sm"
          onClick={() => score.mutate()}
          loading={score.isPending}
        >
          <PlayIcon /> Run score
        </Button>
      </div>
      {score.data ? (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left">Model</th>
                <th className="px-3 py-2 text-right">nDCG</th>
                <th className="px-3 py-2 text-right">MRR</th>
                <th className="px-3 py-2 text-right">Recall</th>
                <th className="px-3 py-2 text-right">Rerank lift</th>
              </tr>
            </thead>
            <tbody>
              {score.data.per_model.map((m) => (
                <tr
                  key={m.model}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-3 py-1.5 font-mono text-2xs">{m.model}</td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {num(m.ndcg)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {num(m.mrr)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {num(m.recall)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {num(m.rerank_lift)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-1.5 text-2xs text-muted-foreground">
            {score.data.n_queries} queries @ k={score.data.k}
          </div>
        </div>
      ) : null}
    </LensSection>
  );
}

export function EvalTab() {
  return (
    <div className="flex flex-col gap-6">
      <ScoreRunner />
      <QueryLogExplorer />
    </div>
  );
}
