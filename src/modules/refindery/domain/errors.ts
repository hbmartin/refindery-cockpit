/**
 * Normalizes refindery's polymorphic error bodies into a single shape the UI
 * can render. `detail` may be a string or a FastAPI `ValidationError[]`; the 403
 * body is overloaded (scope error `{detail}` vs ingest error
 * `{error:"blacklisted", pattern}`); `/readyz` returns `{status:...}`.
 */

export type ApiErrorKind =
  | 'unauthorized' // 401 — token missing/invalid
  | 'forbidden' // 403 — needs write scope
  | 'blacklisted' // 403 — ingest blocked by blacklist
  | 'not_found'
  | 'conflict' // 409 — in-flight / LIFO / state violation
  | 'unprocessable' // 422 — validation
  | 'unavailable' // 503 — not ready
  | 'network' // transport failure (no response)
  | 'http'; // any other status

export type ApiError = {
  kind: ApiErrorKind;
  status: number;
  message: string;
  /** Field-level messages when the body was a FastAPI ValidationError[]. */
  fields?: { path: string; message: string }[];
  /** Present for blacklisted ingest errors. */
  pattern?: string;
};

type ValidationErrorItem = {
  loc?: (string | number)[];
  msg?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const kindForStatus = (status: number): ApiErrorKind => {
  switch (status) {
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'unprocessable';
    case 503:
      return 'unavailable';
    default:
      return 'http';
  }
};

const parseValidationItems = (
  items: ValidationErrorItem[]
): { path: string; message: string }[] =>
  items.map((item) => ({
    path: (item.loc ?? []).join('.'),
    message: item.msg ?? 'Invalid value',
  }));

export function parseApiError(status: number, body: unknown): ApiError {
  const base = kindForStatus(status);

  // Overloaded 403: blacklisted ingest error carries `error`/`pattern`.
  if (
    status === 403 &&
    isRecord(body) &&
    body.error === 'blacklisted' &&
    typeof body.pattern === 'string'
  ) {
    return {
      kind: 'blacklisted',
      status,
      message: `Blocked by blacklist pattern "${body.pattern}"`,
      pattern: body.pattern,
    };
  }

  if (isRecord(body) && 'detail' in body) {
    const detail = body.detail;

    if (typeof detail === 'string') {
      return { kind: base, status, message: detail };
    }

    if (Array.isArray(detail)) {
      const fields = parseValidationItems(detail as ValidationErrorItem[]);
      return {
        kind: base === 'http' ? 'unprocessable' : base,
        status,
        message: fields[0]?.message ?? 'Validation failed',
        fields,
      };
    }
  }

  if (isRecord(body) && typeof body.status === 'string') {
    return { kind: base, status, message: `Status: ${body.status}` };
  }

  return {
    kind: base,
    status,
    message: typeof body === 'string' && body ? body : `HTTP ${status}`,
  };
}

export const networkError = (message: string): ApiError => ({
  kind: 'network',
  status: 0,
  message,
});

export function isApiError(value: unknown): value is ApiError {
  return (
    isRecord(value) &&
    typeof value.kind === 'string' &&
    typeof value.status === 'number' &&
    typeof value.message === 'string'
  );
}
