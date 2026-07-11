import { createFileRoute } from '@tanstack/react-router';

import { PulsePage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/')({
  component: PulsePage,
});
