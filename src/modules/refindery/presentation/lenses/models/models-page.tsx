import { useMutation } from '@tanstack/react-query';
import { CheckIcon, DatabaseIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';

import type { BackfillEstimate, ModelInfo } from '../../../index';
import { LensHeader, LensPage } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { ModelStateBadge } from '../../components/status-badge';
import { TypedConfirmDialog } from '../../components/typed-confirm';
import { WriteGate } from '../../components/write-gate';
import {
  errorMessage,
  useApiMutation,
  useBackfillProgress,
  useModels,
} from '../../hooks';
import { refineryKeys } from '../../query-keys';
import { useRefinderyApi } from '../../refindery-client-context';

function BackfillControl({ model }: { model: ModelInfo }) {
  const refineryApi = useRefinderyApi();
  const [estimate, setEstimate] = useState<BackfillEstimate | null>(null);
  const [polling, setPolling] = useState(false);
  const progress = useBackfillProgress(model.model_id, polling);

  const estimateMut = useMutation<BackfillEstimate, unknown, void>({
    mutationFn: () => refineryApi.backfillEstimate(model.model_id),
    onSuccess: setEstimate,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const startMut = useApiMutation(
    () => refineryApi.backfillStart(model.model_id),
    {
      success: 'Backfill started',
      invalidate: [refineryKeys.all],
    }
  );

  const pct =
    progress.data && progress.data.total_chunks > 0
      ? Math.round(
          (progress.data.embedded_chunks / progress.data.total_chunks) * 100
        )
      : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Button
          size="xs"
          variant="ghost"
          loading={estimateMut.isPending}
          onClick={() => estimateMut.mutate()}
        >
          <DatabaseIcon /> Estimate
        </Button>
        {estimate ? (
          <Button
            size="xs"
            variant="secondary"
            loading={startMut.isPending}
            onClick={() => {
              startMut.mutate();
              setPolling(true);
            }}
          >
            Start
          </Button>
        ) : null}
      </div>
      {estimate ? (
        <span className="text-2xs text-muted-foreground">
          {estimate.n_chunks.toLocaleString()} chunks ·{' '}
          {estimate.est_cost_usd == null
            ? 'cost unavailable'
            : `$${estimate.est_cost_usd.toFixed(2)}`}{' '}
          ·{' '}
          {estimate.est_duration_s == null
            ? 'duration unavailable'
            : `~${Math.round(estimate.est_duration_s)}s`}
        </span>
      ) : null}
      {progress.data ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-2xs text-muted-foreground">
            {pct}%
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ModelRow({ model }: { model: ModelInfo }) {
  const refineryApi = useRefinderyApi();
  const [retireOpen, setRetireOpen] = useState(false);
  const activate = useApiMutation(
    () => refineryApi.activateModel(model.model_id),
    {
      success: `${model.model_id} activated`,
      invalidate: [refineryKeys.all],
    }
  );
  const retire = useApiMutation(() => refineryApi.retireModel(model.model_id), {
    success: `${model.model_id} retired`,
    invalidate: [refineryKeys.all],
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 font-medium">
          {model.model_id}
          {model.active ? (
            <Badge variant="positive" size="xs">
              active
            </Badge>
          ) : null}
        </span>
        <span className="text-2xs text-muted-foreground">
          {model.provider ?? 'provider ?'} · {model.dimensions ?? '?'}d
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ModelStateBadge state={model.state} />
        <WriteGate>
          <BackfillControl model={model} />
        </WriteGate>
        {!model.active && model.state === 'ready' ? (
          <WriteGate>
            <Button
              size="xs"
              variant="secondary"
              loading={activate.isPending}
              onClick={() => activate.mutate()}
            >
              <CheckIcon /> Activate
            </Button>
          </WriteGate>
        ) : null}
        <WriteGate>
          <Button
            size="icon-xs"
            variant="destructive-secondary"
            disabled={model.active}
            onClick={() => setRetireOpen(true)}
            aria-label="Retire model"
          >
            <Trash2Icon />
          </Button>
        </WriteGate>
      </div>
      <TypedConfirmDialog
        open={retireOpen}
        onOpenChange={setRetireOpen}
        title="Retire model"
        description={`This drops the vector space for "${model.model_id}". This cannot be undone.`}
        confirmPhrase={model.model_id}
        confirmLabel="Retire"
        loading={retire.isPending}
        onConfirm={() => {
          retire.mutate();
          setRetireOpen(false);
        }}
      />
    </div>
  );
}

export function ModelsPage() {
  const { data, isLoading, isError, error } = useModels();
  return (
    <LensPage>
      <LensHeader
        title="Models"
        subtitle="Embedding model lifecycle: register → backfill → activate → retire."
      />
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(data?.length ?? 0) === 0}
        emptyLabel="No models registered."
      >
        <div className="flex flex-col gap-2">
          {(data ?? []).map((model) => (
            <ModelRow key={model.model_id} model={model} />
          ))}
        </div>
      </QueryBoundary>
    </LensPage>
  );
}
