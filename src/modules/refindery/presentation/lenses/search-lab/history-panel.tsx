import { getRouteApi } from '@tanstack/react-router';
import { HistoryIcon } from 'lucide-react';

import { Button } from '@/platform/components/ui/button';

import type { SearchHistoryEntry } from '../../../application/ports/search-history-store';
import {
  useClearSearchHistory,
  useSearchHistory,
} from '../../use-search-history';

const route = getRouteApi('/_shell/search');

const relTime = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const s = Math.round((Date.now() - then) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const paramSummary = (entry: SearchHistoryEntry): string => {
  const parts = [`k=${entry.k}`, `cand=${entry.candidates}`];
  if (entry.rerank) parts.push('rerank');
  if (entry.domain) parts.push(entry.domain);
  return parts.join(' · ');
};

/** Recent successful runs; clicking one replays it through the URL, which the
 * search tab's auto-run effect picks up. Hidden while history is empty. */
export function HistoryPanel() {
  const history = useSearchHistory();
  const clear = useClearSearchHistory();
  const navigate = route.useNavigate();

  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <HistoryIcon className="size-3.5" /> Recent searches
        </span>
        <Button size="xs" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>
      <ul className="flex flex-col gap-1">
        {history.map((entry) => (
          <li key={`${entry.executedAt}-${entry.query}`}>
            <button
              type="button"
              onClick={() =>
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    tab: 'search',
                    query: entry.query,
                    k: entry.k,
                    candidates: entry.candidates,
                    rerank: entry.rerank,
                    domain: entry.domain,
                  }),
                })
              }
              className="flex w-full items-baseline gap-2 rounded-md border border-border/40 bg-card/40 px-2.5 py-1.5 text-left text-xs transition-colors hover:border-border hover:bg-card"
            >
              <span className="line-clamp-1 flex-1 font-medium">
                {entry.query}
              </span>
              <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                {paramSummary(entry)}
              </span>
              <span className="shrink-0 text-2xs text-muted-foreground">
                {relTime(entry.executedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
