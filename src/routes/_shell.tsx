import { createFileRoute, Outlet } from '@tanstack/react-router';

import { CockpitShell } from '@/modules/refindery/presentation';

export const Route = createFileRoute('/_shell')({
  component: ShellLayout,
});

function ShellLayout() {
  return (
    <CockpitShell>
      <Outlet />
    </CockpitShell>
  );
}
