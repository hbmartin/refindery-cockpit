import type { ReactNode } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

type Tone = 'neutral' | 'positive' | 'warning' | 'negative';

const TONE_RING: Record<Tone, string> = {
  neutral: 'border-border/60',
  positive: 'border-status-positive/40',
  warning: 'border-status-warning/50',
  negative: 'border-status-negative/50',
};

const TONE_VALUE: Record<Tone, string> = {
  neutral: 'text-foreground',
  positive: 'text-status-positive',
  warning: 'text-status-warning',
  negative: 'text-status-negative',
};

export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border bg-card/60 px-4 py-3',
        TONE_RING[tone],
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <span
        className={cn(
          'font-mono text-2xl leading-none font-semibold tabular-nums',
          TONE_VALUE[tone]
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}
