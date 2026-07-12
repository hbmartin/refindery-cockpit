import { describe, expect, it } from 'vitest';

import {
  parseHttpConfig,
  parseTelemetryConfig,
} from '@/modules/kernel/testing';

describe('HTTP and telemetry configuration', () => {
  it('accepts zero trusted proxies for directly exposed deployments', () => {
    expect(parseHttpConfig({ TRUSTED_PROXY_DEPTH: '0' })).toEqual({
      trustedProxyDepth: 0,
    });
  });

  it('allows production telemetry to be disabled', () => {
    expect(parseTelemetryConfig({ NODE_ENV: 'production' }).collectorUrl).toBe(
      undefined
    );
  });

  it('still rejects insecure non-local production collectors', () => {
    expect(() =>
      parseTelemetryConfig({
        NODE_ENV: 'production',
        OTEL_COLLECTOR_URL: 'http://otel.example.com',
      })
    ).toThrow('OTEL_COLLECTOR_URL must use HTTPS');
  });
});
