import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';

import { LensHeader, LensPage, LensSection } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { PageStatusBadge } from '../../components/status-badge';
import {
  usePage,
  usePageChunks,
  usePageEntities,
  useSimilar,
} from '../../hooks';

export function PageDetail({ pageId }: { pageId: string }) {
  const page = usePage(pageId);
  const chunks = usePageChunks(pageId);
  const entities = usePageEntities(pageId);
  const similar = useSimilar(pageId);

  return (
    <LensPage>
      <LensHeader
        title={page.data?.title || 'Page'}
        subtitle={page.data?.canonical_url}
        actions={
          <Button size="sm" variant="ghost" render={<Link to="/pages" />}>
            <ArrowLeftIcon /> Library
          </Button>
        }
      />

      <QueryBoundary
        isLoading={page.isLoading}
        isError={page.isError}
        error={page.error}
      >
        {page.data ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <PageStatusBadge status={page.data.status} />
              {page.data.last_error ? (
                <span className="font-mono text-2xs text-status-negative">
                  {page.data.last_error}
                </span>
              ) : null}
              <a
                href={page.data.canonical_url}
                target="_blank"
                rel="noreferrer"
                className="text-2xs text-muted-foreground hover:underline"
              >
                open source ↗
              </a>
            </div>

            {entities.data && entities.data.length > 0 ? (
              <LensSection title="Entities">
                <div className="flex flex-wrap gap-1">
                  {entities.data.map((entity) => (
                    <Badge key={entity.entity_id} variant="secondary" size="sm">
                      {entity.canonical_form}
                    </Badge>
                  ))}
                </div>
              </LensSection>
            ) : null}

            {similar.data && similar.data.length > 0 ? (
              <LensSection title="Similar pages">
                <div className="flex flex-col gap-1">
                  {similar.data.map((result) => (
                    <Link
                      key={result.page_id}
                      to="/pages/$pageId"
                      params={{ pageId: result.page_id }}
                      className="flex items-baseline gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/40"
                    >
                      <span className="line-clamp-1 flex-1">
                        {result.title || result.canonical_url}
                      </span>
                      <span className="font-mono text-2xs text-muted-foreground">
                        {result.score.toFixed(3)}
                      </span>
                    </Link>
                  ))}
                </div>
              </LensSection>
            ) : null}

            {page.data.body_text ? (
              <LensSection title="Body">
                <div className="max-h-96 overflow-y-auto rounded-lg border border-border/60 bg-card/40 p-4 text-sm whitespace-pre-wrap">
                  {page.data.body_text}
                </div>
              </LensSection>
            ) : null}

            {chunks.data && chunks.data.length > 0 ? (
              <LensSection title={`Chunks · ${chunks.data.length}`}>
                <div className="flex flex-col gap-2">
                  {chunks.data.map((chunk) => (
                    <div
                      key={chunk.chunk_id}
                      className="rounded-lg border border-border/60 bg-card/40 p-2"
                    >
                      <div className="mb-1 flex items-center gap-2 text-2xs text-muted-foreground">
                        <span className="font-mono">#{chunk.ordinal}</span>
                        {chunk.token_count != null ? (
                          <span>{chunk.token_count} tokens</span>
                        ) : null}
                      </div>
                      <p className="line-clamp-3 text-xs">{chunk.text}</p>
                    </div>
                  ))}
                </div>
              </LensSection>
            ) : null}
          </>
        ) : null}
      </QueryBoundary>
    </LensPage>
  );
}
