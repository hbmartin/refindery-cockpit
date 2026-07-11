import { createFileRoute } from '@tanstack/react-router';

import { PageDetail } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/pages/$pageId')({
  component: PageDetailRoute,
});

function PageDetailRoute() {
  const { pageId } = Route.useParams();
  return <PageDetail pageId={pageId} />;
}
