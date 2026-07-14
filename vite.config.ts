import babel from '@rolldown/plugin-babel';
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function srcJsonImportPlugin(): Plugin {
  return {
    name: 'start-ui:src-json-import',
    apply: 'serve',
    configureServer(server) {
      const srcDir = path.resolve(server.config.root, 'src');

      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        const url = new URL(req.url, 'http://localhost');
        const isSrcJsonImport =
          url.pathname.startsWith('/src/') &&
          url.pathname.endsWith('.json') &&
          url.searchParams.has('import');

        if (!isSrcJsonImport) {
          next();
          return;
        }

        let decodedPathname: string;

        try {
          decodedPathname = decodeURIComponent(url.pathname);
        } catch {
          next();
          return;
        }

        const filePath = path.resolve(
          server.config.root,
          `.${decodedPathname}`
        );

        if (!filePath.startsWith(`${srcDir}${path.sep}`)) {
          next();
          return;
        }

        try {
          const source = await readFile(filePath, 'utf8');
          res.setHeader('Content-Type', 'text/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(
            `const data = JSON.parse(${JSON.stringify(source)});\nexport default data;\n`
          );
        } catch {
          next();
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const sentryEnv = loadEnv(mode, process.cwd(), 'SENTRY_');
  const envName = env.VITE_ENV_NAME?.toLowerCase();
  const isTestRuntime = envName === 'test' || envName === 'tests';
  const sentryPlugins =
    env.VITE_SENTRY_DSN &&
    sentryEnv.SENTRY_ORG &&
    sentryEnv.SENTRY_PROJECT &&
    sentryEnv.SENTRY_AUTH_TOKEN
      ? sentryTanstackStart({
          org: sentryEnv.SENTRY_ORG,
          project: sentryEnv.SENTRY_PROJECT,
          authToken: sentryEnv.SENTRY_AUTH_TOKEN,
        })
      : [];

  // The cockpit talks to a running refindery over its HTTP API. In dev we proxy
  // the refindery surfaces (same-origin in prod when served from refindery /admin)
  // so the browser can use relative paths and share the bearer token with no CORS.
  const refineryTarget = env.VITE_REFINDERY_TARGET ?? 'http://127.0.0.1:8000';
  const refineryProxyPaths = [
    '/v1',
    '/metrics',
    '/healthz',
    '/readyz',
    '/openapi.json',
    '/mcp',
  ];
  const refineryProxy = Object.fromEntries(
    refineryProxyPaths.map((proxyPath) => [
      proxyPath,
      { target: refineryTarget, changeOrigin: true, ws: proxyPath === '/mcp' },
    ])
  );

  return {
    // Served from refindery's `/admin` mount in production (static SPA), so
    // every emitted asset URL and the router are prefixed with this base.
    base: '/admin/',
    build: {
      target: 'baseline-widely-available',
    },
    server: {
      port: env.VITE_PORT ? Number(env.VITE_PORT) : 3000,
      strictPort: true,
      proxy: refineryProxy,
    },
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      ...(isTestRuntime ? [] : devtools()),
      srcJsonImportPlugin(),
      // SPA mode: build a static client bundle (prerendered shell + assets)
      // instead of a Node SSR server, so refindery can serve it from `/admin`
      // via StaticFiles. All data still flows client-side to the refindery API.
      // `maskPath` renders the shell at the based root (the router basepath is
      // `/admin`); crawling is off because every real route is client-only and
      // data-dependent, so there is nothing to statically crawl.
      tanstackStart({
        spa: {
          enabled: true,
          maskPath: '/admin/',
          prerender: { crawlLinks: false, outputPath: '/index.html' },
        },
      }),
      nitro(),
      // react's vite plugin must come after start's vite plugin
      viteReact(),
      babel({ presets: [reactCompilerPreset()] }),
      ...sentryPlugins,
    ],
  };
});
