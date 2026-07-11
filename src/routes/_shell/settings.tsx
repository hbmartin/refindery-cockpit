import { createFileRoute } from '@tanstack/react-router';

import { SettingsPage } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell/settings')({
  component: SettingsPage,
});
