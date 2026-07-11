import { createFileRoute } from '@tanstack/react-router';

import { SearchLabPage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/search')({
  component: SearchLabPage,
});
