import { SearchIcon } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/platform/components/ui/badge';
import { Button } from '@/platform/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/platform/components/ui/card';
import { Input } from '@/platform/components/ui/input';

import { LensHeader, LensPage, LensSection } from '../../components/lens';
import { QueryBoundary } from '../../components/query-boundary';
import { StatTile } from '../../components/stat-tile';
import { useEntity } from '../../hooks';

export function EntitiesPage() {
  const [input, setInput] = useState('');
  const [ref, setRef] = useState<string | undefined>(undefined);
  const entity = useEntity(ref);

  const resolve = () => {
    const value = input.trim();
    if (value) setRef(value);
  };

  return (
    <LensPage>
      <LensHeader
        title="Entities"
        subtitle="Resolve an entity by id or canonical form. Table/graph views await a list + co-occurrence endpoint."
      />

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') resolve();
          }}
          placeholder="Entity id or canonical form (e.g. 'PostgreSQL')"
          className="max-w-md"
        />
        <Button onClick={resolve} disabled={!input.trim()}>
          <SearchIcon /> Resolve
        </Button>
      </div>

      {ref ? (
        <QueryBoundary
          isLoading={entity.isLoading}
          isError={entity.isError}
          error={entity.error}
        >
          {entity.data ? (
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {entity.data.canonical_form}
                  <Badge variant="secondary" size="sm">
                    {entity.data.type}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-3">
                  <StatTile
                    label="Mentions"
                    value={entity.data.mention_count}
                  />
                  <StatTile label="Pages" value={entity.data.page_count} />
                  <StatTile
                    label="IDF"
                    value={
                      entity.data.idf != null ? entity.data.idf.toFixed(2) : '—'
                    }
                  />
                </div>
                {entity.data.aliases && entity.data.aliases.length > 0 ? (
                  <LensSection title="Aliases">
                    <div className="flex flex-wrap gap-1">
                      {entity.data.aliases.map((alias) => (
                        <Badge key={alias} variant="secondary" size="sm">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  </LensSection>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </QueryBoundary>
      ) : (
        <p className="text-sm text-muted-foreground">
          Enter an entity reference to inspect its mentions, aliases, and IDF.
        </p>
      )}
    </LensPage>
  );
}
