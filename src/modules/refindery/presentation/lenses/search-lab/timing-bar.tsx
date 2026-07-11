import { cn } from '@/platform/lib/tailwind/utils';

import type { StageTiming } from '../../../index';

const STAGES: { key: keyof StageTiming; label: string; color: string }[] = [
  { key: 'embed', label: 'embed', color: 'bg-chart-1' },
  { key: 'dense', label: 'dense', color: 'bg-chart-2' },
  { key: 'sparse', label: 'sparse', color: 'bg-chart-3' },
  { key: 'fuse', label: 'fuse', color: 'bg-chart-4' },
  { key: 'rollup', label: 'rollup', color: 'bg-chart-5' },
  { key: 'rerank', label: 'rerank', color: 'bg-primary' },
  { key: 'hydrate', label: 'hydrate', color: 'bg-muted-foreground' },
];

/** Stacked per-stage latency breakdown, so relevance timing is debuggable. */
export function TimingBar({ timing }: { timing: StageTiming }) {
  const segments = STAGES.map((stage) => ({
    ...stage,
    ms: timing[stage.key] ?? 0,
  })).filter((seg) => seg.ms > 0);
  const total = timing.total ?? segments.reduce((sum, seg) => sum + seg.ms, 0);
  if (total <= 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((seg) => (
          <div
            key={seg.key}
            className={cn(seg.color)}
            style={{ width: `${(seg.ms / total) * 100}%` }}
            title={`${seg.label}: ${seg.ms.toFixed(1)}ms`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-2xs text-muted-foreground">
        {segments.map((seg) => (
          <span key={seg.key} className="font-mono">
            {seg.label} {seg.ms.toFixed(0)}ms
          </span>
        ))}
        <span className="font-mono font-semibold text-foreground">
          total {total.toFixed(0)}ms
        </span>
      </div>
    </div>
  );
}
