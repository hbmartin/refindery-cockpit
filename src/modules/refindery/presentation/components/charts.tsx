import { useId } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

export type SeriesPoint = { t: number; value: number };

const buildPath = (
  points: SeriesPoint[],
  width: number,
  height: number,
  pad: number
): { line: string; area: string; min: number; max: number } | null => {
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  const times = points.map((p) => p.t);
  const minV = Math.min(...values);
  const maxV = Math.max(...values, minV + 1);
  const minT = Math.min(...times);
  const maxT = Math.max(...times, minT + 1);
  const w = width - pad * 2;
  const h = height - pad * 2;

  const x = (t: number) => pad + ((t - minT) / (maxT - minT)) * w;
  const y = (v: number) => pad + h - ((v - minV) / (maxV - minV)) * h;

  const coords = points.map(
    (p) => `${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`
  );
  const line = `M${coords.join(' L')}`;
  const area = `${line} L${x(maxT).toFixed(1)},${(pad + h).toFixed(1)} L${x(minT).toFixed(1)},${(pad + h).toFixed(1)} Z`;
  return { line, area, min: minV, max: maxV };
};

/**
 * Small dependency-free time-series line+area chart. The cockpit plan calls for
 * ECharts; this keeps the walking skeleton buildable without a heavy dep and can
 * be swapped for an ECharts wrapper later.
 */
export function TimeSeriesChart({
  points,
  height = 160,
  className,
  color = 'var(--color-chart-1, oklch(0.7 0.15 250))',
  label,
  format = (v) => String(Math.round(v)),
}: {
  points: SeriesPoint[];
  height?: number;
  className?: string;
  color?: string;
  label?: string;
  format?: (v: number) => string;
}) {
  const gradientId = useId();
  const width = 640;
  const pad = 8;
  const path = buildPath(points, width, height, pad);

  if (!path) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground',
          className
        )}
        style={{ height }}
      >
        No samples
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border/60 bg-card/40 p-2',
        className
      )}
    >
      {label ? (
        <div className="mb-1 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-mono tabular-nums">{format(path.max)}</span>
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-auto w-full"
        role="img"
        aria-label={label ?? 'time series'}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={path.area} fill={`url(#${gradientId})`} />
        <path
          d={path.line}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

/** Inline sparkline for table cells / tight KPI rows. */
export function Sparkline({
  points,
  width = 96,
  height = 24,
  color = 'currentColor',
  className,
}: {
  points: SeriesPoint[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const path = buildPath(points, width, height, 2);
  if (!path) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
    >
      <path
        d={path.line}
        fill="none"
        stroke={color}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
