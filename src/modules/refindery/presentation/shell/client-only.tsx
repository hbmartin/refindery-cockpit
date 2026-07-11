import type { ReactNode } from 'react';

import { useHydrated } from '@/platform/hooks/use-hydrated';

/**
 * Renders children only after hydration. The cockpit is a client-driven polling
 * SPA — its data hooks must not run during SSR (disabled queries would sit
 * pending and stall Start's dehydration/serialization). Gating the shell here
 * keeps SSR to an inert shell and mounts everything client-side.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const hydrated = useHydrated();
  return <>{hydrated ? children : fallback}</>;
}
