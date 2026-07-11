import { describe, expect, it } from 'vitest';

import { deriveAlerts, parseApiError } from '@/modules/refindery';

describe('parseApiError', () => {
  it('handles a string detail (scope error)', () => {
    const error = parseApiError(403, { detail: 'write scope required' });
    expect(error.kind).toBe('forbidden');
    expect(error.message).toBe('write scope required');
  });

  it('handles the overloaded blacklisted 403', () => {
    const error = parseApiError(403, {
      error: 'blacklisted',
      pattern: 'example.com',
    });
    expect(error.kind).toBe('blacklisted');
    expect(error.pattern).toBe('example.com');
  });

  it('flattens a FastAPI ValidationError[] detail', () => {
    const error = parseApiError(422, {
      detail: [{ loc: ['body', 'query'], msg: 'field required' }],
    });
    expect(error.kind).toBe('unprocessable');
    expect(error.fields?.[0]).toEqual({
      path: 'body.query',
      message: 'field required',
    });
  });

  it('maps 401 to unauthorized', () => {
    expect(parseApiError(401, { detail: 'bad token' }).kind).toBe(
      'unauthorized'
    );
  });

  it('handles a readyz-style status body', () => {
    const error = parseApiError(503, { status: 'starting' });
    expect(error.kind).toBe('unavailable');
    expect(error.message).toContain('starting');
  });
});

describe('deriveAlerts', () => {
  it('flags dead jobs as critical on the jobs lens', () => {
    const alerts = deriveAlerts({ deadJobs: 2 });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ severity: 'critical', lens: 'jobs' });
  });

  it('warns on tombstone backlog over threshold', () => {
    expect(deriveAlerts({ tombstoneBacklog: 200 })).toHaveLength(1);
    expect(deriveAlerts({ tombstoneBacklog: 5 })).toHaveLength(0);
  });

  it('returns nothing when all signals are clean', () => {
    expect(deriveAlerts({ deadJobs: 0, tombstoneBacklog: 0 })).toHaveLength(0);
  });
});
