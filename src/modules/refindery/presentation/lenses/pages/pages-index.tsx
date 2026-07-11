import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/platform/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/platform/components/ui/card';
import { Input } from '@/platform/components/ui/input';
import { Textarea } from '@/platform/components/ui/textarea';

import { errorMessage, refineryApi } from '../../../client';
import type { IngestOutcome } from '../../../index';
import { LensHeader, LensPage } from '../../components/lens';
import { WriteGate } from '../../components/write-gate';

function LookupCard() {
  const navigate = useNavigate();
  const [id, setId] = useState('');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Open a page</CardTitle>
        <CardDescription>Jump to a page detail by its id.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && id.trim()) {
                void navigate({
                  to: '/pages/$pageId',
                  params: { pageId: id.trim() },
                });
              }
            }}
            placeholder="page id"
          />
          <Button
            disabled={!id.trim()}
            onClick={() =>
              navigate({ to: '/pages/$pageId', params: { pageId: id.trim() } })
            }
          >
            Open <ArrowRightIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IngestCard() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const ingest = useMutation<IngestOutcome, unknown, void>({
    mutationFn: () =>
      refineryApi.ingestPage({
        canonical_url: url.trim(),
        title: title.trim() || undefined,
        body_extracted: body.trim() || undefined,
      }),
    onSuccess: (outcome) => {
      if (outcome.outcome === 'blacklisted') {
        toast.error(`Blocked by blacklist pattern "${outcome.pattern}"`);
        return;
      }
      toast.success(
        outcome.outcome === 'revisit' ? 'Page revisited' : 'Page queued'
      );
      void navigate({
        to: '/pages/$pageId',
        params: { pageId: outcome.page_id },
      });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual ingest</CardTitle>
        <CardDescription>
          Test a URL by pasting its extracted body. refindery never fetches —
          you provide the content.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="canonical url"
        />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title (optional)"
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="extracted body text"
          rows={5}
        />
        <WriteGate>
          <Button
            className="self-start"
            disabled={!url.trim() || !body.trim()}
            loading={ingest.isPending}
            onClick={() => ingest.mutate()}
          >
            <PlusIcon /> Ingest
          </Button>
        </WriteGate>
      </CardContent>
    </Card>
  );
}

export function PagesIndex() {
  return (
    <LensPage>
      <LensHeader
        title="Pages / Library"
        subtitle="The connective tissue — every point across the cockpit deep-links to a page detail."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <LookupCard />
        <IngestCard />
      </div>
    </LensPage>
  );
}
