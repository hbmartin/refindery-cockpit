import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { isApiError } from '@/modules/refindery';
import { httpClient, tokenStore } from '@/modules/refindery/testing';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const caught = async (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => null,
    (thrown: unknown) => thrown
  );

describe('refindery HTTP client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(json({}));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStore.set(null);
  });

  describe('query building', () => {
    it('skips undefined, null, and empty-string values', async () => {
      await httpClient.get('/v1/jobs', {
        limit: 5,
        kind: '',
        status: null,
        q: undefined,
      });
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/v1/jobs?limit=5');
    });

    it('keeps meaningful falsy values (false, 0)', async () => {
      await httpClient.get('/v1/clusters', { include_tombstoned: false, k: 0 });
      expect(fetchMock.mock.calls[0]?.[0]).toBe(
        '/v1/clusters?include_tombstoned=false&k=0'
      );
    });

    it('emits no question mark without params', async () => {
      await httpClient.get('/v1/jobs');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/v1/jobs');
    });
  });

  describe('auth headers', () => {
    it('injects the bearer token when one is stored', async () => {
      tokenStore.set('tok-123');
      await httpClient.get('/v1/whoami');
      const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
      expect(headers.get('authorization')).toBe('Bearer tok-123');
    });

    it('omits the header without a token', async () => {
      await httpClient.get('/v1/whoami');
      const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
      expect(headers.get('authorization')).toBeNull();
    });
  });

  describe('request bodies', () => {
    it('serializes POST bodies as JSON with a content-type', async () => {
      await httpClient.post('/v1/feedback', { a: 1 });
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.body).toBe(JSON.stringify({ a: 1 }));
      expect((init.headers as Headers).get('content-type')).toBe(
        'application/json'
      );
    });

    it('sends no body or content-type for body-less POSTs', async () => {
      await httpClient.post('/v1/clusters/recompute');
      const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
      expect(init.body).toBeUndefined();
      expect((init.headers as Headers).get('content-type')).toBeNull();
    });

    it('passes the DELETE method through', async () => {
      await httpClient.delete('/v1/models/m-1');
      expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE');
    });
  });

  describe('response bodies', () => {
    it('parses JSON responses', async () => {
      fetchMock.mockResolvedValue(json({ ok: true }));
      await expect(httpClient.get('/v1/x')).resolves.toEqual({ ok: true });
    });

    it('resolves 204 to undefined', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
      await expect(httpClient.post('/v1/x')).resolves.toBeUndefined();
    });

    it('falls back to raw text when JSON parsing fails', async () => {
      fetchMock.mockResolvedValue(
        new Response('not-json', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
      await expect(httpClient.get('/v1/x')).resolves.toBe('not-json');
    });

    it('returns plain text bodies as text and empty bodies as undefined', async () => {
      fetchMock.mockResolvedValue(
        new Response('hello', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        })
      );
      await expect(httpClient.get('/v1/x')).resolves.toBe('hello');

      fetchMock.mockResolvedValue(new Response('', { status: 200 }));
      await expect(httpClient.get('/v1/x')).resolves.toBeUndefined();
    });
  });

  describe('error mapping', () => {
    it('maps a 403 string detail to forbidden', async () => {
      fetchMock.mockResolvedValue(
        json({ detail: 'Write scope required' }, 403)
      );
      const error = await caught(httpClient.post('/v1/forget', {}));
      expect(isApiError(error) && error.kind).toBe('forbidden');
      expect(isApiError(error) && error.status).toBe(403);
      expect(isApiError(error) && error.message).toBe('Write scope required');
    });

    it('maps the overloaded blacklisted 403 with its pattern', async () => {
      fetchMock.mockResolvedValue(
        json({ error: 'blacklisted', pattern: 'example.com' }, 403)
      );
      const error = await caught(httpClient.post('/v1/pages', {}));
      expect(isApiError(error) && error.kind).toBe('blacklisted');
      expect(isApiError(error) && error.pattern).toBe('example.com');
    });

    it('maps a FastAPI 422 validation array to field errors', async () => {
      fetchMock.mockResolvedValue(
        json({ detail: [{ loc: ['body', 'k'], msg: 'too small' }] }, 422)
      );
      const error = await caught(httpClient.post('/v1/search', {}));
      expect(isApiError(error) && error.kind).toBe('unprocessable');
      expect(isApiError(error) && error.fields).toEqual([
        { path: 'body.k', message: 'too small' },
      ]);
    });

    it('maps fetch failures to a network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const error = await caught(httpClient.get('/v1/jobs'));
      expect(isApiError(error) && error.kind).toBe('network');
      expect(isApiError(error) && error.status).toBe(0);
      expect(isApiError(error) && error.message).toBe(
        'Cannot reach refindery: fetch failed'
      );
    });

    it('maps non-Error fetch rejections to the generic network message', async () => {
      fetchMock.mockRejectedValue('boom');
      const error = await caught(httpClient.get('/v1/jobs'));
      expect(isApiError(error) && error.message).toBe('Cannot reach refindery');
    });
  });

  describe('metricsText', () => {
    it('returns the raw exposition text with auth', async () => {
      tokenStore.set('tok-123');
      fetchMock.mockResolvedValue(new Response('# HELP up', { status: 200 }));
      await expect(httpClient.metricsText()).resolves.toBe('# HELP up');
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/metrics');
      const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
      expect(headers.get('authorization')).toBe('Bearer tok-123');
    });

    it('maps HTTP failures through parseApiError', async () => {
      fetchMock.mockResolvedValue(new Response('down', { status: 503 }));
      const error = await caught(httpClient.metricsText());
      expect(isApiError(error) && error.kind).toBe('unavailable');
    });

    it('maps fetch failures to a network error without the refindery prefix', async () => {
      fetchMock.mockRejectedValue(new TypeError('offline'));
      const error = await caught(httpClient.metricsText());
      expect(isApiError(error) && error.kind).toBe('network');
      expect(isApiError(error) && error.message).toBe('offline');
    });
  });
});
