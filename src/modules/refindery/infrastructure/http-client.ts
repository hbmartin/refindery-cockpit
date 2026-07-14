/**
 * Thin fetch wrapper for the refindery HTTP API. Injects the bearer token,
 * targets same-origin relative paths (dev proxy / prod `/admin` static mount
 * handle routing), and normalizes failures into `ApiError` via `parseApiError`.
 */
import { tokenStore } from './token-store';
import { type ApiError, networkError, parseApiError } from '../domain/errors';

type QueryValue = string | number | boolean | undefined | null;

const buildQuery = (params?: Record<string, QueryValue>): string => {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

const authHeaders = (extra?: HeadersInit): Headers => {
  const headers = new Headers(extra);
  const token = tokenStore.peek();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
};

const throwFor = (error: ApiError): never => {
  throw error;
};

async function request<T>(
  method: string,
  path: string,
  options: {
    query?: Record<string, QueryValue>;
    body?: unknown;
  } = {}
): Promise<T> {
  const url = `${path}${buildQuery(options.query)}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: authHeaders(
        options.body === undefined
          ? undefined
          : { 'content-type': 'application/json' }
      ),
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (cause) {
    return throwFor(
      networkError(
        cause instanceof Error
          ? `Cannot reach refindery: ${cause.message}`
          : 'Cannot reach refindery'
      )
    );
  }

  if (!response.ok) {
    return throwFor(parseApiError(response.status, await readBody(response)));
  }

  if (response.status === 204) return undefined as T;
  return (await readBody(response)) as T;
}

export const httpClient = {
  get: <T>(path: string, query?: Record<string, QueryValue>) =>
    request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: Record<string, QueryValue>) =>
    request<T>('POST', path, { body, query }),
  delete: <T>(path: string, query?: Record<string, QueryValue>) =>
    request<T>('DELETE', path, { query }),

  /** `/metrics` is Prometheus text, not JSON. */
  async metricsText(): Promise<string> {
    let response: Response;
    try {
      response = await fetch('/metrics', { headers: authHeaders() });
    } catch (cause) {
      throw networkError(
        cause instanceof Error ? cause.message : 'Cannot reach /metrics'
      );
    }
    if (!response.ok) {
      throw parseApiError(response.status, await response.text());
    }
    return response.text();
  },
};
