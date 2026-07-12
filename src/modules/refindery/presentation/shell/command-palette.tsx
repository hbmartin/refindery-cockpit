import { useNavigate } from '@tanstack/react-router';
import { SearchIcon } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

import { Button } from '@/platform/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/platform/components/ui/dialog';
import { Input } from '@/platform/components/ui/input';

import { filterActions, type PaletteAction } from './command-actions';
import { NAV_ITEMS } from './nav-items';
import { useApiMutation, useCanWrite, useJobs } from '../hooks';
import { refineryKeys } from '../query-keys';
import { useRefinderyApi } from '../refindery-client-context';

const MAX_DEAD_JOB_ACTIONS = 10;

/**
 * Cmd/Ctrl+K palette: navigate to a lens, run a search, open a page by id, or
 * retry a dead job. Renders its own header trigger plus the dialog. Reads dead
 * jobs from the already-polling `useJobs()` cache — no extra network.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const canWrite = useCanWrite();
  const refineryApi = useRefinderyApi();
  const jobs = useJobs();
  const retry = useApiMutation((id: string) => refineryApi.retryJob(id), {
    success: 'Job re-queued',
    invalidate: [refineryKeys.all],
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !event.defaultPrevented
      ) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const close = () => {
    setOpen(false);
    setInput('');
    setActiveIndex(0);
  };

  const trimmed = input.trim();

  const actions: PaletteAction[] = [
    ...NAV_ITEMS.map((item) => ({
      id: `nav-${item.id}`,
      group: 'Navigate' as const,
      label: item.label,
      keywords: item.to,
      run: () => void navigate({ to: item.to }),
    })),
    ...(trimmed
      ? [
          {
            id: 'search-for',
            group: 'Actions' as const,
            label: `Search for "${trimmed}"`,
            run: () =>
              void navigate({ to: '/search', search: { query: trimmed } }),
          },
          {
            id: 'go-to-page',
            group: 'Actions' as const,
            label: `Go to page "${trimmed}"`,
            run: () =>
              void navigate({
                to: '/pages/$pageId',
                params: { pageId: trimmed },
              }),
          },
        ]
      : []),
    ...(canWrite
      ? (jobs.data ?? [])
          .filter((job) => job.status === 'dead')
          .slice(0, MAX_DEAD_JOB_ACTIONS)
          .map((job) => ({
            id: `retry-${job.job_id}`,
            group: 'Jobs' as const,
            label: `Retry job ${job.job_id.slice(0, 8)} · ${job.kind}`,
            keywords: job.job_id,
            run: () => retry.mutate(job.job_id),
          }))
      : []),
  ];

  const filtered = filterActions(actions, trimmed);
  const active = Math.min(activeIndex, Math.max(filtered.length - 1, 0));

  const runAction = (action: PaletteAction) => {
    close();
    action.run();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="gap-1.5 text-muted-foreground"
      >
        <SearchIcon />
        <kbd className="rounded border border-border/60 bg-muted px-1 font-mono text-2xs">
          ⌘K
        </kbd>
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : close())}
      >
        <DialogContent
          hideCloseButton
          className="top-24 max-w-lg translate-y-0 gap-0 p-0"
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <Input
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const action = filtered[active];
                if (action) runAction(action);
              }
            }}
            placeholder="Type a command, search, or page id…"
            className="rounded-b-none border-0 border-b border-border/60 focus-visible:ring-0"
          />
          <div className="max-h-80 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                No matching commands.
              </p>
            ) : null}
            {filtered.map((action, index) => (
              <Fragment key={action.id}>
                {filtered[index - 1]?.group !== action.group ? (
                  <div className="px-2.5 pt-2 pb-1 text-2xs font-medium text-muted-foreground">
                    {action.group}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => runAction(action)}
                  onMouseMove={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
                    index === active ? 'bg-muted' : ''
                  )}
                >
                  {action.label}
                </button>
              </Fragment>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
