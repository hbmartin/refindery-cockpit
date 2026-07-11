import { Badge } from '@/platform/components/ui/badge';

import type { JobStatus, ModelState, PageState } from '../../domain/api-types';

type Variant = 'default' | 'secondary' | 'positive' | 'warning' | 'negative';

const JOB_VARIANT: Record<JobStatus, Variant> = {
  pending: 'secondary',
  running: 'default',
  done: 'positive',
  failed: 'warning',
  dead: 'negative',
};

const PAGE_VARIANT: Record<PageState, Variant> = {
  queued: 'secondary',
  indexing: 'default',
  indexed: 'positive',
  failed: 'warning',
  dead: 'negative',
};

const MODEL_VARIANT: Record<ModelState, Variant> = {
  registered: 'secondary',
  backfilling: 'default',
  ready: 'positive',
  active: 'positive',
  retired: 'negative',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge
      variant={JOB_VARIANT[status]}
      size="sm"
      className="font-mono uppercase"
    >
      {status}
    </Badge>
  );
}

export function PageStatusBadge({ status }: { status: PageState }) {
  return (
    <Badge
      variant={PAGE_VARIANT[status]}
      size="sm"
      className="font-mono uppercase"
    >
      {status}
    </Badge>
  );
}

export function ModelStateBadge({ state }: { state: ModelState }) {
  return (
    <Badge
      variant={MODEL_VARIANT[state]}
      size="sm"
      className="font-mono uppercase"
    >
      {state}
    </Badge>
  );
}
