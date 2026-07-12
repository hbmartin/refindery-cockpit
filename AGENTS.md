# Agent Instructions for refindery-cockpit

## What This Codebase Is

The **refindery cockpit**: a local, single-user TanStack Start application for
operating a running [refindery](https://github.com/hbmartin/refindery) instance
(personal reading-history search). It is organized as a strict modular monolith
with hexagonal boundaries per capability, built on the start-ui-web minimal
boilerplate. UI primitives and shared technical utilities live under
`src/platform`; app-owned shell/support resources live under `src/app`; the
single business capability lives in `src/modules/refindery` (plus the
cross-cutting `kernel` module); production wiring lives under `src/composition`.

## Canonical Commands

Use these commands instead of invoking underlying tools directly.

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the local dev server (proxies the refindery API). |
| `pnpm check` | Static checks: format, lint, typecheck, depcruise, gen:api:check, semgrep, audit. |
| `pnpm test` | Vitest unit and browser projects. |
| `pnpm test:affected:list` | List tests associated with changed files. |
| `pnpm test:affected` | Run tests associated with changed files. |
| `pnpm test:mutation` | Stryker mutation testing (runtime-config, kernel, shared, refindery scopes). |
| `pnpm test:e2e:visual` | Local Chromium visual regression check for stable critical screens. |
| `pnpm test:e2e:visual:update` | Update local visual baselines for review. |
| `pnpm gen:api` | Refresh the OpenAPI snapshot + generated API types from a running refindery. |
| `pnpm gen:api:check` | Fail if `api.gen.ts` is stale relative to the committed spec (CI-safe, no network). |
| `pnpm build` | Production build. |
| `pnpm verify` | Full pre-merge gate: `check` + `test` + `build`. |
| `pnpm verify:task` | Task-level verification runner with timestamped logs under `test-results/task-verification/`. |
| `pnpm format:changed` | Format changed files only. |

After code changes, run `pnpm format:changed && pnpm check && pnpm test:affected`. Before merge, run `pnpm verify`.

## Task Verification Loop

Use a layered verification loop rather than relying on one broad command.

- Start with the narrowest relevant unit, browser, or E2E checks for the behavior being changed.
- For UI changes, start the local app with `pnpm dev` (ideally against a running refindery at `VITE_REFINDERY_TARGET`), inspect the affected lens, and check desktop and mobile viewports for console errors, broken interactions, text overflow, and layout overlap.
- Capture screenshots or Playwright artifacts for meaningful UI changes. Prefer local Playwright screenshots for visual regression with `pnpm test:e2e:visual`; update baselines for review with `pnpm test:e2e:visual:update`. Do not add Percy, Applitools, Cypress, BrowserStack, or another external visual/browser service unless explicitly requested.
- After code changes, run `pnpm format:changed && pnpm check && pnpm test:affected`.
- Use `pnpm verify:task` when a single command/report is more useful than separate commands. Add `-- --visual` for UI changes, `-- --e2e-chromium` for routing/token risk, and `-- --build` for production runtime risk.
- Escalate to `pnpm test:e2e --project=chromium` when routing, token handling, or full-stack behavior is touched.
- Run `pnpm build` for production build/runtime changes, and `pnpm verify` before merge-level handoff.
- When tests fail, inspect Playwright traces, screenshots, videos, console output, network evidence before changing code. Treat retries as a diagnostic signal, not proof of correctness.

Task verification artifacts should be grouped under `test-results/task-verification/<timestamp>/` when using `pnpm verify:task`. Keep Playwright traces, screenshots, videos, and failure attachments in their default `test-results/` locations and link or summarize the relevant paths in the final handoff. Visual test baselines are reviewed repo artifacts; do not silently update them without saying why.

## Public Gates

Cross-module imports must use one of these public files:

| File | Contents |
|---|---|
| `index.ts` | Domain types, application ports, factories, stable constants. |
| `server.ts` | TanStack `createServerFn` exports only. |
| `backend.ts` | Server-only non-server-function APIs, protected runners, HTTP route handlers. |
| `client.ts` | Client-only public API, query options, client facades. |
| `presentation.ts` | React components and presentation exports. |
| `testing.ts` | Test-only public gate for owner internals. |

Do not deep-import another module's `domain/`, `application/`, `infrastructure/`, `transport/`, or `presentation/` internals. `kernel` internals are the practical exception for cross-cutting primitives.

## Module Rules

`domain/` is pure TypeScript. `application/` depends on ports, not adapters. `infrastructure/` owns SDKs and provider adapters. `transport/` maps protocol inputs to use cases. `presentation/` owns React UI, query options, and form schemas.

Keep route and transport handlers thin: validate and normalize input, call the relevant public module gate or use case, then map tagged outcomes or `AppError` values to the framework response.

Parse external input once at the boundary with the appropriate schema mechanism: TanStack `validateSearch`, form schemas, HTTP DTO schemas, upload/webhook validators, or focused Zod schemas. Pass typed, normalized values inward rather than re-parsing inside domain or application code.

Business and application time must come from an injected `Clock` port. Direct `new Date()` calls belong only in clock adapters, schema/database defaults, tests, scripts, and external/framework boundary mapping.

Keep files named by concrete concern. Avoid catch-all `utils.ts`, broad `service.ts`, or multi-purpose files; prefer scoped names such as `query-keys.ts`, `token-store.ts`, or `search-history-store.ts`.

## The refindery Module

The cockpit's single capability, `src/modules/refindery`. Orientation map:

- **Lens model.** Each operator screen is a "lens" under
  `presentation/lenses/*` (Pulse `/`, Jobs, Search Lab, Clusters, Entities,
  Models, Pages, System, Settings), exported only via `presentation.ts` and
  mounted by thin routes in `src/routes/_shell/*`. The shell
  (`presentation/shell/`) owns nav (`nav-items.ts`), alert badges
  (`use-alerts.ts`), and the ⌘K command palette (`command-palette.tsx`).
- **Deep-linkable lens state.** Search-Lab state and the Jobs status filter
  live in URL search params: zod schemas in
  `presentation/lenses/*/{search-lab,jobs}-search.ts` plug directly into the
  routes' `validateSearch`; lenses read them via `getRouteApi('/_shell/…')`.
  Search Lab auto-runs whenever the URL carries a new runnable query — one
  mechanism serves direct runs, deep links, history replay, and the palette.
- **DI via context.** Presentation never imports its own infrastructure.
  `RefinderyClientProvider` injects `{ api, tokenStore, searchHistory }`
  (wired in `src/composition/providers.tsx`); hooks come from
  `presentation/refindery-client-context.ts`.
- **Token store.** `infrastructure/token-store.ts` — one bearer token in
  `localStorage` (`refindery.token`, plaintext by design for localhost),
  read reactively via `useSyncExternalStore` (`presentation/use-token.ts`)
  and synchronously at request time (`peek()`). Server snapshot is always
  `null`. Switching tokens calls `queryClient.removeQueries({ queryKey:
  refineryKeys.all })` so no cached data crosses identities.
  `infrastructure/search-history-store.ts` follows the same pattern for
  recent Search-Lab runs (`refindery.search-history`, capped, deduped).
- **HTTP client + errors.** `infrastructure/http-client.ts` calls same-origin
  relative paths (dev proxy / prod mount handle routing) and normalizes every
  failure into `ApiError` (`domain/errors.ts`). Kinds include the overloaded
  403 `blacklisted` case, `network` (status 0), and `contract` — a 2xx body
  that failed its response schema (see below).
- **Generated API contract.** `domain/openapi.json` is the committed spec
  snapshot; `domain/api.gen.ts` is generated from it (`pnpm gen:api`,
  freshness gated by `pnpm gen:api:check`). Wire (`Raw*`) types in
  `infrastructure/api.ts` alias the generated schemas so backend renames
  break the build; curated domain types in `domain/api-types.ts` alias the
  wire where 1:1 and stay hand-written where they deliberately diverge
  (`Cluster.cluster_id` vs wire `id`, flattened statuses). High-blast-radius
  responses (whoami, jobs, mutation-driving reads) are validated at runtime
  with zod (`infrastructure/schemas.ts`, each `satisfies z.ZodType<wire>`);
  failures surface as `contract` errors and write-gating fails closed.
- **Alerts/canaries.** Pure domain rules: `domain/canaries.ts`
  (`deriveCanaryInput` — maps `/metrics` samples + the job list onto canary
  inputs; metric names are pinned by unit tests so a backend rename fails
  loudly) and `domain/thresholds.ts` (`deriveAlerts`,
  `TOMBSTONE_BACKLOG_WARN=100`, `EMBEDDING_ERROR_WARN=1`; dead jobs are the
  only `critical`). `purgedPageHits` is computed but has no alert rule
  (documented open question).
- **Polling cadences.** `presentation/query-keys.ts` `POLL`: fast 2s (jobs,
  backfill progress), medium 5s (ready, metrics), slow 30s (models, clusters,
  config). All reads gate on token presence and `isBrowser`, `retry: false`.
  React Query's default `refetchIntervalInBackground: false` pauses polling
  in blurred windows — do not override it. Prometheus text is parsed once via
  `presentation/use-parsed-metrics.ts` (module-scope `select`); do not call
  `parsePrometheus` per-consumer.
- **Write gating.** `presentation/components/write-gate.tsx` disables mutating
  controls without the `write` scope via a native `<fieldset disabled>` plus
  pointer-events guards for links, with an explanatory tooltip.
- **Test seams.** Extend `testing.ts` when tests need owner internals
  (`createRefineryApi`, `httpClient`, `tokenStore`, stores, search schemas,
  palette helpers). Browser tests fake `RefineryHttpClient` and wrap in
  `RefinderyClientProvider`; lenses that use `getRouteApi` need a memory
  router mirroring the `/_shell/*` route ids (see
  `tests/browser/modules/refindery/`). No MSW.
- **i18n decision.** Refindery lens copy is hardcoded English by team
  decision; platform i18n (en/fr/ar/sw) remains for shell/platform
  components. Do not add lens translation keys.

## Result and Outcome Policy

- Expected business outcomes must be domain-tagged `Result.Ok` variants from `@bloodyowl/boxed`; internal, external-service, system, and persistence failures must be `Result.Error(AppError)`.
- Use direct Boxed APIs (`Result.Ok`, `Result.Error`, `isOk`, `isError`, `get`, `getError`) instead of local `ok` / `fail` wrappers.
- Use `ts-pattern` with Boxed interop (`Result.P.Ok(...)` and `Result.P.Error(...)`) for exhaustive result handling at mapping boundaries.
- Do not return nullable or boolean business outcomes from app-owned ports; model those branches as tagged outcomes (e.g. refindery's `IngestOutcome`).
- Do not throw or catch for normal app-owned business flow. Catch failures only at external-service boundaries — in this repo, the refindery HTTP adapter, which normalizes failures into `ApiError` values that React Query surfaces to the lenses.
- Transport, composition, HTTP, and framework adapter boundaries may throw only when the underlying contract is exception-driven (TanStack `ServerFnError`, startup/config validation, final HTTP error mapping).

## Utility Library Guidance

- Use `ts-pattern` when branching over discriminated unions, Boxed `Result` values, tuple-derived UI states, or non-trivial unknown-shape guards where `.exhaustive()` / `isMatching` improves safety. Keep simple one-condition guards as plain `if` checks.
- Use Remeda for non-trivial production collection and object transforms when it improves readability or type narrowing. Keep native APIs for straightforward JSX render loops, framework-specific chains such as fast-check arbitraries, and simple one-off array operations where Remeda would only add indirection.

## Common Guardrails

- `src/platform` must not import `modules`, `routes`, or `composition`.
- `src/modules` must not import `src/app`; routes/app containers compose app shell/support UI around module presentation.
- `src/modules/*/testing.ts` and platform testing gates are test-only and must not be imported by production source.
- Module internals must not import `@/composition`; dependencies are injected through factories or public server barrels.
- Routes import modules only through `index.ts`, `server.ts`, `backend.ts`, `client.ts`, or `presentation.ts`.
- `src/modules/*/presentation/schema.ts` must emit static error keys, not import `i18next` or `react-i18next`; `src/platform/components/form/form-field-error.tsx` translates at render time.
- Legacy roots `src/components`, `src/hooks`, `src/lib`, `src/layout`, `src/features`, and `src/emails` are forbidden; use `src/platform` or `src/modules/<capability>`.
- Route loaders that read search params must declare `validateSearch` and `loaderDeps`, and query keys must include the same normalized values. (The refindery lens routes declare `validateSearch`; no loaders read search today.)
- `src/modules/refindery/domain/api.gen.ts` and `openapi.json` are generated artifacts — never hand-edit; run `pnpm gen:api`.

## Upstream starter patterns (not active in this repo)

The start-ui-web starter this repo is built on ships auth, persistence, and
email adapters that have been removed here. The patterns remain the reference
if those capabilities are reintroduced:

- **Auth boundary**: application code depends on focused ports
  (`SessionGateway`, `AuthorizationGateway`, `AuthEmailPort`,
  `UserAdminGateway`); Better Auth is the reference adapter under
  `src/modules/auth/infrastructure/better-auth`, selected in
  `src/composition/auth.ts`. Better Auth imports stay confined to those
  locations; provider-specific auth tokens stay server-side.
- **Persistence**: Drizzle stays in infrastructure/kernel-infrastructure/
  composition; SQL migration files are immutable once committed; prefer
  integration tests against the real driver for repository/SQL changes.
- **Email**: Resend confined to its adapter module.

## Tests

Use the cheapest test that proves the behavior:

| Type | Location |
|---|---|
| Unit | `tests/unit/**/*.unit.{test,spec}.{ts,tsx}` |
| Browser/component | `tests/browser/**/*.browser.{test,spec}.tsx` |
| Integration | `tests/integration/**/*.integration.test.ts` |
| Architecture/security | `tests/architecture/**/*.unit.spec.ts`, `tests/security/**/*.unit.spec.ts` |
| E2E | `tests/e2e/*.spec.ts` |
| Fixtures/support | `tests/support`, `tests/server`, nearest `*.fixture.tsx` when useful |

Property-based tests import `fc`/`test`/`PROPERTY_DEFAULTS` from
`@tests/support/property-testing` (never `@fast-check/vitest` directly) and use
the `.unit.spec.ts` suffix. The refindery domain is covered by a Stryker scope
(`pnpm test:mutation:refindery`).

When a regression class is likely to repeat, add a guardrail through depcruise, Semgrep, or an architecture test.
