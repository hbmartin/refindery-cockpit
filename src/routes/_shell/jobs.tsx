import { createFileRoute } from '@tanstack/react-router';

import { JobsPage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/jobs')({
  component: JobsPage,
});
