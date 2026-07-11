import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

import type { ProjectionPoint } from '../../../index';

const PALETTE = [
  'oklch(0.72 0.15 250)',
  'oklch(0.72 0.16 60)',
  'oklch(0.70 0.17 150)',
  'oklch(0.70 0.18 20)',
  'oklch(0.72 0.15 320)',
  'oklch(0.75 0.14 100)',
  'oklch(0.68 0.15 200)',
  'oklch(0.72 0.16 30)',
];

/**
 * Per-page 2-D scatter (Ask C2). SVG points colored by cluster; hover shows the
 * title, click deep-links to the page. Medium corpora only — a canvas/scatterGL
 * upgrade is the plan's path for the full ~500k-chunk cloud.
 */
export function ProjectionScatter({ points }: { points: ProjectionPoint[] }) {
  const [hover, setHover] = useState<ProjectionPoint | null>(null);

  const { scaled, colorFor } = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs, 0);
    const maxX = Math.max(...xs, 1);
    const minY = Math.min(...ys, 0);
    const maxY = Math.max(...ys, 1);
    const clusters = [...new Set(points.map((p) => p.cluster_id ?? 'noise'))];
    const colorFor = (id: string | null | undefined) => {
      const idx = clusters.indexOf(id ?? 'noise');
      return id == null
        ? 'oklch(0.6 0 0 / 0.4)'
        : PALETTE[idx % PALETTE.length];
    };
    const scaled = points.map((p) => ({
      p,
      cx: ((p.x - minX) / (maxX - minX || 1)) * 100,
      cy: ((p.y - minY) / (maxY - minY || 1)) * 100,
    }));
    return { scaled, colorFor };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
        No projection for this run.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 100"
        className="h-96 w-full rounded-lg border border-border/60 bg-card/30"
        preserveAspectRatio="none"
      >
        {scaled.map(({ p, cx, cy }) => (
          <circle
            key={p.page_id}
            cx={cx}
            cy={100 - cy}
            r={hover?.page_id === p.page_id ? 1.1 : 0.6}
            fill={colorFor(p.cluster_id)}
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHover(p)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {hover ? (
        <div className="pointer-events-none absolute top-2 left-2 max-w-72 rounded-md border border-border/60 bg-popover px-2 py-1 text-xs shadow">
          <div className="line-clamp-2 font-medium">
            {hover.title || hover.page_id}
          </div>
          <Link
            to="/pages/$pageId"
            params={{ pageId: hover.page_id }}
            className={cn(
              'pointer-events-auto text-2xs text-muted-foreground hover:underline'
            )}
          >
            open page →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
