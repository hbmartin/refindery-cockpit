import { useMemo } from 'react';

import { useJobs } from './hooks';
import { useParsedMetrics } from './use-parsed-metrics';
import { deriveCanaryInput } from '../domain/canaries';
import { type Alert, deriveAlerts } from '../domain/thresholds';

const NO_METRICS = { samples: [] };

/**
 * Derives the in-app alert set from live signals: dead-letter jobs plus the
 * "quietly wrong" canary metrics scraped from `/metrics`. Feeds nav badges and
 * the Pulse banner.
 */
export function useCockpitAlerts(): {
  alerts: Alert[];
  byLens: Map<string, Alert[]>;
} {
  const jobs = useJobs();
  const metrics = useParsedMetrics();

  return useMemo(() => {
    const alerts = deriveAlerts(
      deriveCanaryInput(metrics.data ?? NO_METRICS, jobs.data ?? [])
    );

    const byLens = new Map<string, Alert[]>();
    for (const alert of alerts) {
      const list = byLens.get(alert.lens) ?? [];
      list.push(alert);
      byLens.set(alert.lens, list);
    }

    return { alerts, byLens };
  }, [jobs.data, metrics.data]);
}
