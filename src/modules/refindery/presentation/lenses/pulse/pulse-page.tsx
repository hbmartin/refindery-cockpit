import { AlertBanner } from './alert-banner';
import { useMetricsHistory } from './use-metrics-history';
import {
  gauge,
  histogramQuantile,
  type PromMetrics,
  sumByLabel,
} from '../../../client';
import { TimeSeriesChart } from '../../components/charts';
import { LensHeader, LensPage, LensSection } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { StatTile } from '../../components/stat-tile';
import { useJobs } from '../../hooks';
import { useCockpitAlerts } from '../../use-alerts';

const sumFamily = (m: PromMetrics, name: string): number => {
  let total = 0;
  for (const [, v] of sumByLabel(m, name)) total += v;
  return total;
};

const SELECTORS: Record<string, (m: PromMetrics) => number> = {
  ingest: (m) => sumFamily(m, 'ingest_pages_total'),
  queue: (m) => gauge(m, 'queue_depth') ?? 0,
  searchP95: (m) =>
    (histogramQuantile(m, 'search_duration_seconds', 0.95) ?? 0) * 1000,
};

const ms = (v: number) => `${v.toFixed(0)}ms`;
const int = (v: number) => Math.round(v).toLocaleString();

export function PulsePage() {
  const { parsed, history, isLoading, isError, error } =
    useMetricsHistory(SELECTORS);
  const { alerts } = useCockpitAlerts();
  const jobs = useJobs();

  const searchP50 = parsed
    ? (histogramQuantile(parsed, 'search_duration_seconds', 0.5) ?? 0) * 1000
    : 0;
  const searchP95 = parsed
    ? (histogramQuantile(parsed, 'search_duration_seconds', 0.95) ?? 0) * 1000
    : 0;
  const rerankP95 = parsed
    ? (histogramQuantile(parsed, 'rerank_duration_seconds', 0.95) ?? 0) * 1000
    : 0;

  const queueDepth = parsed ? (gauge(parsed, 'queue_depth') ?? 0) : 0;
  const ingestTotal = parsed ? sumFamily(parsed, 'ingest_pages_total') : 0;
  const jobFailures = parsed ? sumFamily(parsed, 'job_failures_total') : 0;
  const embeddingErrors = parsed
    ? sumFamily(parsed, 'embedding_api_errors_total')
    : 0;

  // Canary signals — the "quietly wrong" set.
  const tombstoneBacklog = parsed
    ? parsed.samples
        .filter(
          (s) =>
            s.name === 'vector_tombstone_backlog' &&
            s.labels.status === 'pending'
        )
        .reduce((sum, s) => sum + s.value, 0)
    : 0;
  const queryLogDropped = parsed
    ? (gauge(parsed, 'query_log_dropped_total') ?? 0)
    : 0;
  const purgedPageHits = parsed
    ? (gauge(parsed, 'purged_page_hits_total') ?? 0)
    : 0;
  const deadJobs = (jobs.data ?? []).filter((j) => j.status === 'dead').length;

  // Pipeline funnel: open jobs by kind.
  const jobsByKind = new Map<string, number>();
  for (const job of jobs.data ?? []) {
    if (job.status === 'done') continue;
    jobsByKind.set(job.kind, (jobsByKind.get(job.kind) ?? 0) + 1);
  }

  return (
    <LensPage>
      <LensHeader
        title="Pulse"
        subtitle="Live health of the retrieval pipeline. Percentiles are bucket-estimated from Prometheus histograms."
      />

      <AlertBanner alerts={alerts} />

      <QueryBoundary isLoading={isLoading} isError={isError} error={error}>
        <LensSection title="Throughput & latency">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Ingested pages" value={int(ingestTotal)} />
            <StatTile
              label="Queue depth"
              value={int(queueDepth)}
              tone={queueDepth > 0 ? 'warning' : 'neutral'}
            />
            <StatTile
              label="Search p50"
              value={ms(searchP50)}
              hint={`p95 ${ms(searchP95)}`}
            />
            <StatTile label="Rerank p95" value={ms(rerankP95)} />
            <StatTile
              label="Job failures"
              value={int(jobFailures)}
              tone={jobFailures > 0 ? 'warning' : 'neutral'}
            />
          </div>
        </LensSection>

        <LensSection title="Canary strip · the quietly-wrong signals">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Tombstone backlog"
              value={int(tombstoneBacklog)}
              tone={tombstoneBacklog > 100 ? 'warning' : 'neutral'}
              hint="pending vector deletes"
            />
            <StatTile
              label="Query log dropped"
              value={int(queryLogDropped)}
              tone={queryLogDropped > 0 ? 'warning' : 'neutral'}
            />
            <StatTile
              label="Purged page hits"
              value={int(purgedPageHits)}
              tone={purgedPageHits > 0 ? 'warning' : 'neutral'}
            />
            <StatTile
              label="Dead jobs"
              value={int(deadJobs)}
              tone={deadJobs > 0 ? 'negative' : 'neutral'}
            />
          </div>
        </LensSection>

        <div className="grid gap-4 lg:grid-cols-2">
          <LensSection title="Ingest throughput">
            <TimeSeriesChart
              points={history.get('ingest') ?? []}
              label="ingest_pages_total"
              format={int}
            />
          </LensSection>
          <LensSection title="Queue depth">
            <TimeSeriesChart
              points={history.get('queue') ?? []}
              label="queue_depth"
              color="var(--color-chart-2, oklch(0.72 0.16 60))"
              format={int}
            />
          </LensSection>
        </div>

        <LensSection title="Pipeline funnel · open jobs by kind">
          {jobsByKind.size === 0 ? (
            <p className="text-sm text-muted-foreground">No open jobs.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[...jobsByKind.entries()].map(([kind, count]) => (
                <StatTile key={kind} label={kind} value={int(count)} />
              ))}
            </div>
          )}
        </LensSection>

        {embeddingErrors > 0 ? (
          <p className="text-xs text-status-warning">
            {int(embeddingErrors)} embedding API errors recorded.
          </p>
        ) : null}
      </QueryBoundary>
    </LensPage>
  );
}
