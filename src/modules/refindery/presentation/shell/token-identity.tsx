import { Link } from '@tanstack/react-router';

import { Badge } from '@/platform/components/ui/badge';

import { useWhoAmI } from '../hooks';
import { useHasToken } from '../use-token';

/** Top-bar identity chip: token name + scope, or a prompt to add a token. */
export function TokenIdentity() {
  const hasToken = useHasToken();
  const { data, isError } = useWhoAmI();

  if (!hasToken) {
    return (
      <Link
        to="/settings"
        className="text-xs font-medium text-status-warning hover:underline"
      >
        No token
      </Link>
    );
  }

  if (isError) {
    return (
      <Link
        to="/settings"
        className="text-xs font-medium text-status-negative hover:underline"
      >
        Invalid token
      </Link>
    );
  }

  const canWrite = data?.scopes?.includes('write');

  return (
    <Link
      to="/settings"
      className="flex items-center gap-1.5 text-xs hover:opacity-80"
    >
      <span className="max-w-32 truncate font-medium text-foreground">
        {data?.name ?? '…'}
      </span>
      <Badge
        variant={canWrite ? 'positive' : 'secondary'}
        size="xs"
        className="uppercase"
      >
        {canWrite ? 'write' : 'read'}
      </Badge>
    </Link>
  );
}
