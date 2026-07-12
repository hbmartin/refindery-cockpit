import { describe, expect } from 'vitest';

import {
  type CanaryInput,
  deriveAlerts,
  EMBEDDING_ERROR_WARN,
  TOMBSTONE_BACKLOG_WARN,
} from '@/modules/refindery';
import { fc, PROPERTY_DEFAULTS, test } from '@tests/support/property-testing';

const canaryArb = fc.record(
  {
    deadJobs: fc.nat(1000),
    tombstoneBacklog: fc.nat(1000),
    queryLogDropped: fc.nat(1000),
    purgedPageHits: fc.nat(1000),
    embeddingErrors: fc.nat(1000),
  },
  { requiredKeys: [] }
);

const fullCanaryArb = fc.record({
  deadJobs: fc.nat(1000),
  tombstoneBacklog: fc.nat(1000),
  queryLogDropped: fc.nat(1000),
  purgedPageHits: fc.nat(1000),
  embeddingErrors: fc.nat(1000),
});

const alertIds = (input: Partial<CanaryInput>): string[] =>
  deriveAlerts(input).map((alert) => alert.id);

describe('deriveAlerts properties', () => {
  test.prop([canaryArb], PROPERTY_DEFAULTS)(
    'ids are unique, drawn from the known set, and only dead-jobs is critical',
    (input) => {
      const alerts = deriveAlerts(input);
      const ids = alerts.map((alert) => alert.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const alert of alerts) {
        expect([
          'dead-jobs',
          'tombstone-backlog',
          'query-log-dropped',
          'embedding-errors',
        ]).toContain(alert.id);
        expect(alert.severity === 'critical').toBe(alert.id === 'dead-jobs');
        expect(alert.lens).toBe(alert.id === 'dead-jobs' ? 'jobs' : 'pulse');
      }
    }
  );

  test.prop([fc.nat(1000)], PROPERTY_DEFAULTS)(
    'dead-jobs alert fires iff deadJobs > 0',
    (deadJobs) => {
      expect(alertIds({ deadJobs }).includes('dead-jobs')).toBe(deadJobs > 0);
    }
  );

  test.prop([fc.nat(1000)], PROPERTY_DEFAULTS)(
    'tombstone alert fires iff backlog exceeds the threshold',
    (tombstoneBacklog) => {
      expect(alertIds({ tombstoneBacklog }).includes('tombstone-backlog')).toBe(
        tombstoneBacklog > TOMBSTONE_BACKLOG_WARN
      );
    }
  );

  test.prop([fc.nat(1000)], PROPERTY_DEFAULTS)(
    'query-log alert fires iff any rows were dropped',
    (queryLogDropped) => {
      expect(alertIds({ queryLogDropped }).includes('query-log-dropped')).toBe(
        queryLogDropped > 0
      );
    }
  );

  test.prop([fc.nat(1000)], PROPERTY_DEFAULTS)(
    'embedding alert fires iff errors reach the threshold',
    (embeddingErrors) => {
      expect(alertIds({ embeddingErrors }).includes('embedding-errors')).toBe(
        embeddingErrors >= EMBEDDING_ERROR_WARN
      );
    }
  );

  test.prop([fullCanaryArb, fullCanaryArb], PROPERTY_DEFAULTS)(
    'alerts are monotone: raising inputs never clears an alert',
    (base, delta) => {
      const raised = {
        deadJobs: base.deadJobs + delta.deadJobs,
        tombstoneBacklog: base.tombstoneBacklog + delta.tombstoneBacklog,
        queryLogDropped: base.queryLogDropped + delta.queryLogDropped,
        purgedPageHits: base.purgedPageHits + delta.purgedPageHits,
        embeddingErrors: base.embeddingErrors + delta.embeddingErrors,
      };
      const raisedIds = new Set(alertIds(raised));
      for (const id of alertIds(base)) {
        expect(raisedIds.has(id)).toBe(true);
      }
    }
  );

  test.prop([fullCanaryArb], PROPERTY_DEFAULTS)(
    'a missing key behaves exactly like zero',
    (input) => {
      const withoutZeroKeys = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== 0)
      ) as Partial<CanaryInput>;
      expect(deriveAlerts(withoutZeroKeys)).toEqual(deriveAlerts(input));
    }
  );

  // Documents current behavior: purgedPageHits feeds CanaryInput but no rule
  // consumes it. Open question for review — intentional (Pages-lens display
  // only) or a missing threshold?
  test.prop([fc.nat(1_000_000)], PROPERTY_DEFAULTS)(
    'purgedPageHits alone never trips an alert',
    (purgedPageHits) => {
      expect(deriveAlerts({ purgedPageHits })).toEqual([]);
    }
  );
});

describe('deriveAlerts examples', () => {
  test('boundary values around each threshold', () => {
    expect(alertIds({ tombstoneBacklog: TOMBSTONE_BACKLOG_WARN })).toEqual([]);
    expect(alertIds({ tombstoneBacklog: TOMBSTONE_BACKLOG_WARN + 1 })).toEqual([
      'tombstone-backlog',
    ]);
    expect(alertIds({ queryLogDropped: 0 })).toEqual([]);
    expect(alertIds({ queryLogDropped: 1 })).toEqual(['query-log-dropped']);
    expect(alertIds({ embeddingErrors: EMBEDDING_ERROR_WARN - 1 })).toEqual([]);
    expect(alertIds({ embeddingErrors: EMBEDDING_ERROR_WARN })).toEqual([
      'embedding-errors',
    ]);
    expect(deriveAlerts({})).toEqual([]);
  });

  test('dead-job label pluralizes', () => {
    expect(deriveAlerts({ deadJobs: 1 })[0]?.label).toBe('1 dead job');
    expect(deriveAlerts({ deadJobs: 2 })[0]?.label).toBe('2 dead jobs');
  });

  test('warning labels carry their counts', () => {
    expect(deriveAlerts({ tombstoneBacklog: 150 })[0]?.label).toBe(
      '150 pending vector tombstones'
    );
    expect(deriveAlerts({ queryLogDropped: 4 })[0]?.label).toBe(
      '4 query-log rows dropped'
    );
    expect(deriveAlerts({ embeddingErrors: 2 })[0]?.label).toBe(
      '2 embedding API errors'
    );
  });
});
