import { createFileRoute } from '@tanstack/react-router';

import { JobsPage, jobsSearchSchema } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/jobs')({
  // Note: any future loader reading `search` must also declare `loaderDeps`
  // (enforced by the missing-route-search-deps CodeQL rule).
  validateSearch: jobsSearchSchema,
  component: JobsPage,
});
