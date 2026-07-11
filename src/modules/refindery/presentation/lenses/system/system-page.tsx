import { useMutation } from '@tanstack/react-query';
import { Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';
import { Input } from '@/platform/components/ui/input';

import { errorMessage, refineryApi, refineryKeys } from '../../../client';
import type { BlacklistEntry, ConfigField, ForgetResult } from '../../../index';
import { LensHeader, LensPage, LensSection } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { TypedConfirmDialog } from '../../components/typed-confirm';
import { WriteGate } from '../../components/write-gate';
import { useApiMutation, useBlacklist, useConfig, useMcp } from '../../hooks';

function ConfigInspector() {
  const { data, isLoading, isError, error } = useConfig();

  const groups = useMemo(() => {
    const map = new Map<string, ConfigField[]>();
    for (const field of data?.fields ?? []) {
      const group = field.group ?? 'general';
      const list = map.get(group) ?? [];
      list.push(field);
      map.set(group, list);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <LensSection title="Config inspector · read-only">
      <QueryBoundary isLoading={isLoading} isError={isError} error={error}>
        <div className="flex flex-col gap-4">
          {groups.map(([group, fields]) => (
            <div key={group}>
              <div className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group}
              </div>
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <tbody>
                    {fields.map((field) => (
                      <tr
                        key={field.key}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-3 py-1.5 font-mono text-2xs whitespace-nowrap">
                          {field.key}
                          {field.boot_only ? (
                            <Badge
                              variant="secondary"
                              size="xs"
                              className="ml-2"
                            >
                              boot-only
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-3 py-1.5 font-mono text-2xs break-all text-muted-foreground">
                          {JSON.stringify(field.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-2xs text-muted-foreground">
            Changing boot-only settings requires a restart — there is no
            live-reload path.
          </p>
        </div>
      </QueryBoundary>
    </LensSection>
  );
}

function McpPanel() {
  const { data, isLoading, isError, error } = useMcp();
  return (
    <LensSection title="MCP server">
      <QueryBoundary isLoading={isLoading} isError={isError} error={error}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Mutating tools:</span>
            <Badge
              variant={data?.enable_mutating_tools ? 'warning' : 'secondary'}
              size="sm"
            >
              {data?.enable_mutating_tools ? 'enabled' : 'disabled'}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            {(data?.tools ?? []).map((tool) => (
              <Badge
                key={tool.name}
                variant={tool.mutating ? 'warning' : 'secondary'}
                size="sm"
                title={tool.description ?? undefined}
              >
                {tool.name}
              </Badge>
            ))}
          </div>
        </div>
      </QueryBoundary>
    </LensSection>
  );
}

function BlacklistPanel() {
  const { data, isLoading, isError, error } = useBlacklist();
  const remove = useApiMutation(
    (id: string) => refineryApi.removeBlacklist(id),
    {
      success: 'Blacklist rule removed',
      invalidate: [refineryKeys.blacklist()],
    }
  );
  return (
    <LensSection title="Blacklist">
      <QueryBoundary
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={(data?.length ?? 0) === 0}
        emptyLabel="No blacklist rules."
      >
        <div className="flex flex-col gap-1">
          {(data ?? []).map((entry: BlacklistEntry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-md border border-border/60 px-3 py-1.5 text-sm"
            >
              <span className="font-mono text-xs">{entry.pattern}</span>
              <WriteGate>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  loading={remove.isPending}
                  onClick={() => remove.mutate(entry.id)}
                  aria-label="Remove rule"
                >
                  <Trash2Icon />
                </Button>
              </WriteGate>
            </div>
          ))}
        </div>
      </QueryBoundary>
    </LensSection>
  );
}

function ForgetPanel() {
  const [url, setUrl] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const forget = useMutation<ForgetResult, unknown, void>({
    mutationFn: () => refineryApi.forget({ url: url.trim() }),
    onSuccess: (result) => {
      toast.success(
        `Purged ${result.pages_purged} pages, queued ${result.vector_deletes_queued} deletes`
      );
      setUrl('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <LensSection title="Forget · purge + blacklist">
      <p className="text-xs text-muted-foreground">
        Irreversible. Purges matching pages and blacklists the URL/domain.
        Un-blacklisting later does not restore content.
      </p>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/page or example.com"
          className="max-w-md"
        />
        <WriteGate>
          <Button
            variant="destructive-secondary"
            disabled={!url.trim()}
            onClick={() => setConfirmOpen(true)}
          >
            Forget
          </Button>
        </WriteGate>
      </div>
      <TypedConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Forget URL"
        description={`Permanently purge and blacklist "${url.trim()}". This cannot be undone.`}
        confirmPhrase="forget"
        confirmLabel="Purge & blacklist"
        loading={forget.isPending}
        onConfirm={() => {
          forget.mutate();
          setConfirmOpen(false);
        }}
      />
    </LensSection>
  );
}

export function SystemPage() {
  return (
    <LensPage>
      <LensHeader
        title="System"
        subtitle="Inspect effective config, MCP tools, and manage the blacklist / forget operations."
      />
      <McpPanel />
      <BlacklistPanel />
      <ForgetPanel />
      <ConfigInspector />
    </LensPage>
  );
}
