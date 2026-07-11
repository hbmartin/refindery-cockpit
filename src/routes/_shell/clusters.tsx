import { createFileRoute } from '@tanstack/react-router';

import { ClustersPage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/clusters')({
  component: ClustersPage,
});
