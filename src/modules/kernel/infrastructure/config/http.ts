import { z } from 'zod';

import { baseEnvSchema, parseEnv } from './env-schema';

const httpEnvSchema = baseEnvSchema.extend({
  TRUSTED_PROXY_DEPTH: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.coerce.number().int().nonnegative().optional()
  ),
});

export type HttpConfig = {
  /**
   * Number of trusted reverse-proxy hops in front of the app. Used to read the
   * genuine client IP from `X-Forwarded-For` (see `getClientIp`). Must match the
   * deployment topology to avoid trusting attacker-supplied entries. Defaults to
   * `1` (a single trusted edge/proxy). Depth `0` means the app is directly
   * exposed and no forwarded client-IP header is trusted.
   */
  trustedProxyDepth: number;
};

let cachedHttpConfig: HttpConfig | undefined;

export function parseHttpConfig(source?: Record<string, unknown>): HttpConfig {
  const env = parseEnv(httpEnvSchema, source);
  return {
    trustedProxyDepth: env.TRUSTED_PROXY_DEPTH ?? 1,
  };
}

export function getHttpConfig(): HttpConfig {
  if (cachedHttpConfig) return cachedHttpConfig;

  cachedHttpConfig = parseHttpConfig();
  return cachedHttpConfig;
}
