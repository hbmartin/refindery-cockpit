import { AlertTriangleIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

import type { Alert } from '../../../domain/thresholds';

/** Dismissible, threshold-driven banner aggregating the canary alerts. */
export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || alerts.length === 0) return null;

  const critical = alerts.some((a) => a.severity === 'critical');

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        critical
          ? 'border-status-negative/50 bg-status-negative/10'
          : 'border-status-warning/50 bg-status-warning/10'
      )}
    >
      <AlertTriangleIcon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          critical ? 'text-status-negative' : 'text-status-warning'
        )}
      />
      <div className="flex-1">
        <div className="font-medium">
          {alerts.length} signal{alerts.length === 1 ? '' : 's'} need attention
        </div>
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-muted-foreground">
          {alerts.map((alert) => (
            <li key={alert.id}>· {alert.label}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="rounded p-1 text-muted-foreground hover:bg-muted"
        aria-label="Dismiss"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
