import type { ParseResult } from './domain/ids';

export type { ApplicationResult, DomainOutcome } from './application/result';
export { AppError } from './domain/errors/app-error';
export { IdValidationError } from './domain/errors/id-validation-error';
export type { ParseResult } from './domain/ids';
export * from './domain/ids';
export { parseHttpConfig } from './infrastructure/config/http';
export { parseTelemetryConfig } from './infrastructure/config/telemetry';
export {
  type OutcomeHandlerConfig,
  unwrapApplicationResult,
} from './transport/tanstack/result-mapper';
export { ServerFnError } from './transport/tanstack/server-fn-error';

export function unwrapParseResult<TValue>(result: ParseResult<TValue>): TValue {
  if (result.isError()) throw result.getError();
  return result.get();
}
