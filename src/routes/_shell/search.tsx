import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import {
  SearchLabPage,
  searchLabSearchDefaults,
  searchLabSearchSchema,
} from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/search')({
  // Note: any future loader reading `search` must also declare `loaderDeps`
  // (enforced by the missing-route-search-deps CodeQL rule).
  validateSearch: searchLabSearchSchema,
  search: { middlewares: [stripSearchParams(searchLabSearchDefaults)] },
  component: SearchLabPage,
});
