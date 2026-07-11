import { Link } from '@tanstack/react-router';
import { AlertTriangleIcon, KeyRoundIcon, Loader2Icon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

import { Button } from '@/platform/components/ui/button';

import { useHasToken } from '../use-token';
import { isApiError } from '../../client';

type QueryBoundaryProps = {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty?: boolean;
  emptyLabel?: string;
  /** When true, render a "paste a token" prompt if none is stored. */
  requireToken?: boolean;
  className?: string;
  children: ReactNode;
};

const Centered = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground',
      className
    )}
  >
    {children}
  </div>
);

/**
 * Uniform loading / error / empty / no-token states so every lens reads the
 * same. On a 401 it points the user to Settings.
 */
export function QueryBoundary({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyLabel = 'Nothing here yet.',
  requireToken = true,
  className,
  children,
}: QueryBoundaryProps) {
  const hasToken = useHasToken();

  if (requireToken && !hasToken) {
    return (
      <Centered className={className}>
        <KeyRoundIcon className="size-6 text-muted-foreground" />
        <p className="font-medium text-foreground">No token stored</p>
        <p>Paste a refindery bearer token to connect.</p>
        <Button render={<Link to="/settings" />} size="sm" className="mt-1">
          Open Settings
        </Button>
      </Centered>
    );
  }

  if (isLoading) {
    return (
      <Centered className={className}>
        <Loader2Icon className="size-5 animate-spin" />
        <span>Loading…</span>
      </Centered>
    );
  }

  if (isError) {
    const unauthorized = isApiError(error) && error.status === 401;
    const message = isApiError(error)
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Request failed';
    return (
      <Centered className={cn('text-status-negative', className)}>
        <AlertTriangleIcon className="size-6" />
        <p className="font-medium">
          {unauthorized ? 'Token missing or invalid' : 'Request failed'}
        </p>
        <p className="text-muted-foreground">{message}</p>
        {unauthorized ? (
          <Button
            render={<Link to="/settings" />}
            size="sm"
            variant="secondary"
            className="mt-1"
          >
            Fix token
          </Button>
        ) : null}
      </Centered>
    );
  }

  if (isEmpty) {
    return <Centered className={className}>{emptyLabel}</Centered>;
  }

  return <>{children}</>;
}
