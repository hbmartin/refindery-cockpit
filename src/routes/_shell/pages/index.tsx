import { createFileRoute } from '@tanstack/react-router';

import { PagesIndex } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/pages/')({
  component: PagesIndex,
});
