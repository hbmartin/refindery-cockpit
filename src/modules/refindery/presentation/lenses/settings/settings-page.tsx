import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/platform/components/ui/card';
import { Input } from '@/platform/components/ui/input';

import { refineryKeys, setToken } from '../../../client';
import { LensHeader, LensPage } from '../../components/lens';
import { useWhoAmI } from '../../hooks';
import { useToken } from '../../use-token';

export function SettingsPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const whoami = useWhoAmI();

  const save = () => {
    const next = draft.trim();
    if (!next) return;
    setToken(next);
    setDraft('');
    void queryClient.invalidateQueries({ queryKey: refineryKeys.all });
    toast.success('Token saved');
  };

  const clear = () => {
    setToken(null);
    void queryClient.invalidateQueries({ queryKey: refineryKeys.all });
    toast.success('Token cleared');
  };

  return (
    <LensPage>
      <LensHeader
        title="System · Settings"
        subtitle="Authenticate the cockpit against your local refindery instance."
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Bearer token</CardTitle>
          <CardDescription>
            Pasted here and stored in <code>localStorage</code> in plaintext.
            This is acceptable for a localhost, single-user tool only — do not
            use on a shared machine.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            {token ? (
              <Badge variant="positive" size="sm">
                <CheckCircle2Icon className="size-3" /> token stored
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                <TriangleAlertIcon className="size-3" /> no token
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                token ? 'Paste a new token to replace' : 'Paste bearer token'
              }
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') save();
              }}
            />
            <Button onClick={save} disabled={!draft.trim()}>
              Save
            </Button>
            {token ? (
              <Button variant="destructive-secondary" onClick={clear}>
                Clear
              </Button>
            ) : null}
          </div>

          {token ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
              <div className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Identity (whoami)
              </div>
              {whoami.isLoading ? (
                <span className="text-muted-foreground">Resolving…</span>
              ) : whoami.isError ? (
                <span className="text-status-negative">
                  Token rejected — the API returned an error.
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {whoami.data?.name ?? 'unknown'}
                  </span>
                  {(whoami.data?.scopes ?? []).map((scope) => (
                    <Badge
                      key={scope}
                      variant="secondary"
                      size="sm"
                      className="uppercase"
                    >
                      {scope}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </LensPage>
  );
}
