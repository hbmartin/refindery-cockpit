import { RotateCwIcon } from 'lucide-react';

import { Button } from '@/platform/components/ui/button';

import { refineryApi, refineryKeys } from '../../../client';
import type { Job } from '../../../index';
import { Column, DataTable } from '../../components/data-table';
import { LensHeader, LensPage, LensSection } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { JobStatusBadge } from '../../components/status-badge';
import { WriteGate } from '../../components/write-gate';
import { useApiMutation, useJobs } from '../../hooks';

const relTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

function RetryButton({ job }: { job: Job }) {
  const retry = useApiMutation((id: string) => refineryApi.retryJob(id), {
    success: 'Job re-queued',
    invalidate: [refineryKeys.all],
  });
  return (
    <WriteGate>
      <Button
        size="xs"
        variant="secondary"
        loading={retry.isPending}
        onClick={() => retry.mutate(job.job_id)}
      >
        <RotateCwIcon /> Retry
      </Button>
    </WriteGate>
  );
}

const errorCell = (job: Job) =>
  job.last_error ? (
    <span
      className="line-clamp-1 max-w-72 font-mono text-2xs text-status-negative"
      title={job.last_error}
    >
      {job.last_error}
    </span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );

const attemptsCell = (job: Job) => (
  <span className="font-mono tabular-nums">
    {job.attempts}/{job.max_attempts}
  </span>
);

function JobsTable({ jobs, showRetry }: { jobs: Job[]; showRetry: boolean }) {
  const columns: Column<Job>[] = [
    {
      key: 'id',
      header: 'Job',
      cell: (j) => (
        <span className="font-mono text-2xs">{j.job_id.slice(0, 8)}</span>
      ),
    },
    {
      key: 'kind',
      header: 'Kind',
      cell: (j) => <span className="font-medium">{j.kind}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (j) => <JobStatusBadge status={j.status} />,
    },
    { key: 'attempts', header: 'Attempts', cell: attemptsCell, align: 'right' },
    { key: 'error', header: 'Last error', cell: errorCell },
    {
      key: 'updated',
      header: 'Updated',
      cell: (j) => relTime(j.updated_at),
      align: 'right',
    },
    ...(showRetry
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            cell: (j: Job) =>
              j.status === 'dead' ? <RetryButton job={j} /> : null,
          },
        ]
      : []),
  ];
  return <DataTable columns={columns} rows={jobs} rowKey={(j) => j.job_id} />;
}

export function JobsPage() {
  const { data, isLoading, isError, error } = useJobs({ limit: 500 });
  const jobs = data ?? [];
  const dead = jobs.filter((j) => j.status === 'dead');
  const active = jobs.filter((j) => j.status !== 'dead');

  return (
    <LensPage>
      <LensHeader
        title="Jobs / Pipeline"
        subtitle="Background work, grouped by state. Dead-letter jobs are pinned on top; retry re-queues them."
      />
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={jobs.length === 0}
        emptyLabel="No jobs in the queue."
      >
        {dead.length > 0 ? (
          <LensSection title={`Dead letter · ${dead.length}`}>
            <JobsTable jobs={dead} showRetry />
          </LensSection>
        ) : null}
        <LensSection title={`Active & recent · ${active.length}`}>
          <JobsTable jobs={active} showRetry={false} />
        </LensSection>
      </QueryBoundary>
    </LensPage>
  );
}
