import { createFileRoute } from '@tanstack/react-router';

import { EntitiesPage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/entities')({
  component: EntitiesPage,
});
