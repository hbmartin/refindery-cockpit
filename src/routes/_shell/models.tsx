import { createFileRoute } from '@tanstack/react-router';

import { ModelsPage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/models')({
  component: ModelsPage,
});
