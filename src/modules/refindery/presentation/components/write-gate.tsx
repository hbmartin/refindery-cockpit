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
            <span className="inline-flex cursor-not-allowed opacity-50 [&_button]:pointer-events-none" />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>This action needs a write token</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
