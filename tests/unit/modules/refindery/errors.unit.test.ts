import { describe, expect, it } from 'vitest';

import {
  contractError,
  deriveAlerts,
  isApiError,
  parseApiError,
} from '@/modules/refindery';

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
    expect(error.message).toBe('Status: starting');
  });

  it('maps the remaining status codes to their kinds', () => {
    expect(parseApiError(404, { detail: 'nope' }).kind).toBe('not_found');
    expect(parseApiError(409, { detail: 'busy' }).kind).toBe('conflict');
    expect(parseApiError(500, { detail: 'oops' }).kind).toBe('http');
  });

  it('formats the blacklisted message around the pattern', () => {
    expect(
      parseApiError(403, { error: 'blacklisted', pattern: 'example.com' })
        .message
    ).toBe('Blocked by blacklist pattern "example.com"');
  });

  it('falls back to forbidden when a blacklist body has no pattern', () => {
    expect(parseApiError(403, { error: 'blacklisted' }).kind).toBe('forbidden');
  });

  it('upgrades validation arrays on unknown statuses to unprocessable', () => {
    const error = parseApiError(400, {
      detail: [{ loc: ['query'], msg: 'bad' }],
    });
    expect(error.kind).toBe('unprocessable');
    expect(error.message).toBe('bad');
  });

  it('defaults message and path for sparse validation items', () => {
    const error = parseApiError(422, { detail: [{}] });
    expect(error.message).toBe('Invalid value');
    expect(error.fields).toEqual([{ path: '', message: 'Invalid value' }]);
  });

  it('reports "Validation failed" for an empty validation array', () => {
    expect(parseApiError(422, { detail: [] }).message).toBe(
      'Validation failed'
    );
  });

  it('falls back to the raw string body, then to HTTP <status>', () => {
    expect(parseApiError(500, 'went sideways').message).toBe('went sideways');
    expect(parseApiError(500, '').message).toBe('HTTP 500');
    expect(parseApiError(502, undefined).message).toBe('HTTP 502');
  });
});

describe('isApiError', () => {
  it('accepts parsed and constructed ApiErrors', () => {
    expect(isApiError(parseApiError(404, { detail: 'x' }))).toBe(true);
    expect(isApiError(contractError('drift'))).toBe(true);
  });

  it('rejects non-ApiError values', () => {
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError({ kind: 1, status: 'x', message: 2 })).toBe(false);
  });
});

describe('contractError', () => {
  it('builds a contract-kind ApiError carrying field issues', () => {
    const error = contractError('Unexpected response shape from GET /v1/jobs', [
      { path: 'jobs.0.attempts', message: 'Expected number' },
    ]);
    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({
      kind: 'contract',
      status: 0,
      fields: [{ path: 'jobs.0.attempts', message: 'Expected number' }],
    });
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
