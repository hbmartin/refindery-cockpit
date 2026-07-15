import type { ReactNode } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/platform/components/ui/tooltip';

import { useCanWrite } from '../hooks';

/**
 * Disables control actions for read-only tokens with an explanatory tooltip
 * (plan: token-scope UX). Renders children directly when writes are allowed.
 */
export function WriteGate({ children }: { children: ReactNode }) {
  const canWrite = useCanWrite();

  if (canWrite) return <>{children}</>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <fieldset
              disabled
              aria-disabled="true"
              className="inline-flex min-w-0 cursor-not-allowed border-0 p-0 opacity-50 [&_[role=button]]:pointer-events-none [&_a]:pointer-events-none"
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>This action needs a write token</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
