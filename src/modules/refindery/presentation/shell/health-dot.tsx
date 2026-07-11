import { cn } from '@/platform/lib/tailwind/utils';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/platform/components/ui/tooltip';

import { useReady } from '../hooks';

/** Top-bar connection/health indicator driven by `/readyz`. */
export function HealthDot() {
  const { data, isLoading, isError } = useReady();

  const tone = isError
    ? 'bg-status-negative'
    : isLoading
      ? 'bg-status-warning'
      : 'bg-status-positive';
  const text = isError
    ? 'refindery not ready'
    : isLoading
      ? 'checking…'
      : data?.active_model
        ? `ready · ${data.active_model}`
        : 'ready';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground" />
          }
        >
          <span
            className={cn(
              'size-2 rounded-full',
              tone,
              !isError && !isLoading && 'animate-pulse'
            )}
          />
          <span className="hidden sm:inline">{text}</span>
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
