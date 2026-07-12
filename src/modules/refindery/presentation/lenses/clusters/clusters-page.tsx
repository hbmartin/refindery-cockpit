import { RefreshCwIcon } from 'lucide-react';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';

import { ProjectionScatter } from './projection-scatter';
import type { Cluster, ClusterRun } from '../../../index';
import { Column, DataTable } from '../../components/data-table';
import { LensHeader, LensPage, LensSection } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { WriteGate } from '../../components/write-gate';
import {
  useApiMutation,
  useClusterRuns,
  useClusters,
  useProjection,
} from '../../hooks';
import { refineryKeys } from '../../query-keys';
import { useRefinderyApi } from '../../refindery-client-context';

function RecomputeButton() {
  const refineryApi = useRefinderyApi();
  const recompute = useApiMutation(() => refineryApi.recomputeClusters(), {
    success: 'Cluster recompute queued',
    invalidate: [refineryKeys.all],
  });
  return (
    <WriteGate>
      <Button
        size="sm"
        loading={recompute.isPending}
        onClick={() => recompute.mutate()}
      >
        <RefreshCwIcon /> Recompute
      </Button>
    </WriteGate>
  );
}

const clusterColumns: Column<Cluster>[] = [
  {
    key: 'label',
    header: 'Cluster',
    cell: (c) => (
      <span className="flex items-center gap-2">
        <span className="font-medium">
          {c.label || c.cluster_id.slice(0, 8)}
        </span>
        {c.tombstoned ? (
          <Badge variant="negative" size="xs">
            tombstoned
          </Badge>
        ) : null}
      </span>
    ),
  },
  {
    key: 'keywords',
    header: 'Keywords',
    cell: (c) => (
      <span className="line-clamp-1 text-xs text-muted-foreground">
        {(c.keywords ?? []).join(', ') || '—'}
      </span>
    ),
  },
  { key: 'size', header: 'Pages', cell: (c) => c.size, align: 'right' },
];

const runColumns: Column<ClusterRun>[] = [
  { key: 'trigger', header: 'Trigger', cell: (r) => r.trigger ?? '—' },
  { key: 'algo', header: 'Algorithm', cell: (r) => r.algorithm ?? '—' },
  { key: 'pages', header: 'Pages', cell: (r) => r.n_pages, align: 'right' },
  {
    key: 'clusters',
    header: 'Clusters',
    cell: (r) => r.n_clusters,
    align: 'right',
  },
  { key: 'noise', header: 'Noise', cell: (r) => r.n_noise, align: 'right' },
  {
    key: 'dur',
    header: 'Duration',
    align: 'right',
    cell: (r) =>
      r.duration_ms != null ? `${(r.duration_ms / 1000).toFixed(1)}s` : '—',
  },
];

export function ClustersPage() {
  const clusters = useClusters();
  const runs = useClusterRuns();
  const projection = useProjection();

  return (
    <LensPage>
      <LensHeader
        title="Clusters"
        subtitle="Topical clusters over your reading history, with per-page 2-D projection."
        actions={<RecomputeButton />}
      />

      <LensSection title="Per-page projection">
        <QueryBoundary
          isLoading={projection.isLoading}
          isError={projection.isError}
          error={projection.error}
        >
          <ProjectionScatter points={projection.data ?? []} />
        </QueryBoundary>
      </LensSection>

      <LensSection title="Clusters by size">
        <QueryBoundary
          isLoading={clusters.isLoading}
          isError={clusters.isError}
          error={clusters.error}
          isEmpty={(clusters.data?.length ?? 0) === 0}
          emptyLabel="No clusters yet — run a recompute."
        >
          <DataTable
            columns={clusterColumns}
            rows={[...(clusters.data ?? [])].sort((a, b) => b.size - a.size)}
            rowKey={(c) => c.cluster_id}
          />
        </QueryBoundary>
      </LensSection>

      <LensSection title="Run history">
        <QueryBoundary
          isLoading={runs.isLoading}
          isError={runs.isError}
          error={runs.error}
          isEmpty={(runs.data?.length ?? 0) === 0}
          emptyLabel="No cluster runs recorded."
        >
          <DataTable
            columns={runColumns}
            rows={runs.data ?? []}
            rowKey={(r) => r.run_id}
          />
        </QueryBoundary>
      </LensSection>
    </LensPage>
  );
}
