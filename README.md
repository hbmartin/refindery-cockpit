# refindery cockpit

A local, single-user web cockpit for operating a running
[refindery](https://github.com/hbmartin/refindery) instance — your personal
reading-history search refinery. The cockpit gives you live search, background
job triage, cluster/model administration, and "quietly wrong" canary alerting
over the refindery HTTP API.

Built on the start-ui-web minimal boilerplate (TanStack Start, strict modular
monolith with hexagonal boundaries).

## The lens model

The app is a shell around nine operator lenses (`src/modules/refindery/presentation/lenses`):

| Lens       | Route       | What it does                                                        |
| ---------- | ----------- | ------------------------------------------------------------------- |
| Pulse      | `/`         | Health canaries, live metric history, and the aggregated alert feed |
| Jobs       | `/jobs`     | Background work grouped by state; dead-letter triage and retry      |
| Search Lab | `/search`   | Live search, model comparison, and offline eval — deep-linkable     |
| Clusters   | `/clusters` | Cluster browsing, runs, projection, and recompute                   |
| Entities   | `/entities` | Entity lookup and inspection                                        |
| Models     | `/models`   | Register, backfill, activate, and retire embedding models           |
| Pages      | `/pages`    | Ingest and inspect pages, chunks, and page entities                 |
| System     | `/system`   | Effective config, MCP tool metadata, and blacklist                  |
| Settings   | `/settings` | Bearer-token management                                             |

Nav badges and the Pulse banner are driven by pure threshold rules
(`domain/thresholds.ts` + `domain/canaries.ts`): dead jobs are critical; vector
tombstone backlog, dropped query-log rows, and embedding API errors warn.

Press **⌘K / Ctrl+K** anywhere for the command palette: jump to a lens, run a
search, open a page by id, or retry a dead job.

## The token model

Paste a refindery bearer token in **Settings**. It is persisted in
`localStorage` (`refindery.token`) in plaintext — deliberate for a
localhost-only, single-user tool. `/v1/whoami` reports the token's scopes:
`read` unlocks queries; `write` unlocks mutations. Without `write`, every
mutating control is disabled by `WriteGate` with an explanatory tooltip.
Switching tokens drops the entire query cache before the new identity fetches.

## Pointing at refindery

In development, Vite proxies the API paths (`/v1`, `/metrics`, `/healthz`,
`/readyz`, `/openapi.json`, `/mcp`) to `VITE_REFINDERY_TARGET`
(default `http://127.0.0.1:8000`) so the browser talks same-origin. In
production the cockpit is served by refindery itself, so no target is needed.

API types are generated from refindery's OpenAPI spec: `pnpm gen:api` refreshes
the committed `openapi.json` snapshot (from a running instance, falling back to
a sibling `../refindery` checkout) and regenerates
`src/modules/refindery/domain/api.gen.ts`; `pnpm gen:api:check` (part of
`pnpm check`) fails when the generated types are stale. High-blast-radius
responses (whoami, jobs, mutation-driving reads) are additionally validated at
runtime with zod and surface as `contract` errors when the backend drifts.

## Technologies

[⚙️ Node.js](https://nodejs.org), [🟦 TypeScript](https://www.typescriptlang.org/), [⚛️ React](https://react.dev/), [📦 TanStack Start](https://tanstack.com/start), [💨 Tailwind CSS](https://tailwindcss.com/), [🧩 shadcn/ui-style primitives](https://ui.shadcn.com/), [🔎 TanStack Query](https://tanstack.com/query), [🧪 Vitest](https://vitest.dev/), [🎭 Playwright](https://playwright.dev/), [📈 OpenTelemetry + Sentry](https://opentelemetry.io/)

Note on i18n: the platform shell ships i18next (en/fr/ar/sw), but refindery
lens copy is intentionally hardcoded English — this is a localhost operator
tool. Do not add lens translation keys.

## Requirements

- [Node.js](https://nodejs.org) 24.x
- [pnpm](https://pnpm.io/)
- A running [refindery](https://github.com/hbmartin/refindery) instance (or a
  sibling checkout for offline type generation)
- [Docker](https://www.docker.com/) (optional — only for local MinIO / the OTel collector)

## Installation

```bash
cp .env.example .env
pnpm install
```

## Run

```bash
pnpm dev
```

The app is served on the port defined by `VITE_PORT` (default `3000`) and
proxies API calls to `VITE_REFINDERY_TARGET`.

## Verification

```bash
pnpm check           # format, lint, typecheck, depcruise, architecture, gen:api:check, semgrep, audit, knip
pnpm test            # Vitest unit + browser projects
pnpm test:mutation   # Stryker (runtime-config, kernel, shared, refindery scopes)
pnpm build           # production build
pnpm verify          # check + test + build
```

## TypeScript Path Aliases

Imports are aliased to `@/` for `src` and `@tests/` for `tests`.

## Observability

Server telemetry exports to an OpenTelemetry Collector when `OTEL_COLLECTOR_URL`
is set; browser telemetry always posts to the same-origin `/api/telemetry/*`
routes. Sentry is enabled by setting `SENTRY_DSN` / `VITE_SENTRY_DSN`. See
`.env.example` for the full list of telemetry options.

## Architecture

See [`AGENTS.md`](./AGENTS.md) and the rules under `.claude/rules/` for the
module shape, public gates, and layering constraints. The refindery capability
lives in `src/modules/refindery` as a vertical hexagonal slice and is wired in
`src/composition`.

## License

[MIT](./LICENSE)
