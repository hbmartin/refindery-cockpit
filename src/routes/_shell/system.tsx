import { createFileRoute } from '@tanstack/react-router';

import { SystemPage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/system')({
  component: SystemPage,
});
