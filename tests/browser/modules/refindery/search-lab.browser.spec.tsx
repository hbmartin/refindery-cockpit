import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { page, render, setupUser } from '@tests/utils';
import { expect, test } from 'vitest';

import {
  RefinderyClientProvider,
  SearchLabPage,
  searchLabSearchSchema,
} from '@/modules/refindery/presentation';
import {
  createRefineryApi,
  type RefineryHttpClient,
  type SearchHistoryEntry,
} from '@/modules/refindery/testing';

const RAW_RESULT = {
  page_id: 'page-1',
  canonical_url: 'https://example.com/pg',
  title: 'Postgres tuning notes',
  domain: 'example.com',
  first_seen_at: '2026-07-01T00:00:00Z',
  visit_count: 3,
  score: 0.9123,
  exact_match: true,
  cluster: { id: 'cluster-9', label: 'databases' },
  chunks: [
    {
      chunk_id: 'c-1',
      ordinal: 0,
      text: 'shared_buffers should be…',
      score: 0.8,
    },
  ],
};

const createFixture = (
  searchResponse: unknown = {
    query_id: 'query-abc-123',
    results: [RAW_RESULT],
    offset: 0,
    has_more: false,
    suggestions: [],
    timing_ms: { embed: 2, dense: 4, total: 12 },
  }
) => {
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const client: RefineryHttpClient = {
    async get<T>(path: string): Promise<T> {
      calls.push({ method: 'GET', path });
      if (path.startsWith('/v1/whoami')) {
        return { name: 'operator', scopes: ['read', 'write'] } as T;
      }
      throw new Error(`Unexpected GET ${path}`);
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      calls.push({ method: 'POST', path, body });
      if (path === '/v1/search') {
        if (searchResponse instanceof Error) throw searchResponse;
        return searchResponse as T;
      }
      if (path === '/v1/feedback') return undefined as T;
      throw new Error(`Unexpected POST ${path}`);
    },
    async delete<T>(): Promise<T> {
      return undefined as T;
    },
    async metricsText() {
      return '';
    },
  };
  return { client, calls };
};

/** SearchLabPage resolves URL state via getRouteApi('/_shell/search'), so the
 * memory router mirrors the real route ids, plus a stub pages route so
 * result-card links resolve. */
const renderSearchLab = (
  client: RefineryHttpClient,
  initialEntry = '/search'
) => {
  const rootRoute = createRootRoute();
  const shellRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_shell',
  });
  const searchRoute = createRoute({
    getParentRoute: () => shellRoute,
    path: 'search',
    validateSearch: searchLabSearchSchema,
    component: SearchLabPage,
  });
  const pageDetailRoute = createRoute({
    getParentRoute: () => shellRoute,
    path: 'pages/$pageId',
    component: () => null,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      shellRoute.addChildren([searchRoute, pageDetailRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  const tokenStore = {
    subscribe: () => () => undefined,
    getSnapshot: () => 'admin-token',
    getServerSnapshot: () => null,
    set: () => undefined,
    peek: () => 'admin-token',
  };
  const history: SearchHistoryEntry[] = [];
  const historyListeners = new Set<() => void>();
  const searchHistory = {
    subscribe: (listener: () => void) => {
      historyListeners.add(listener);
      return () => historyListeners.delete(listener);
    },
    getSnapshot: () => history,
    getServerSnapshot: () => history,
    record: (entry: SearchHistoryEntry) => {
      history.unshift(entry);
      for (const listener of historyListeners) listener();
    },
    clear: () => {
      history.length = 0;
      for (const listener of historyListeners) listener();
    },
  };

  render(
    <QueryClientProvider client={new QueryClient()}>
      <RefinderyClientProvider
        api={createRefineryApi(client)}
        tokenStore={tokenStore}
        searchHistory={searchHistory}
      >
        <RouterProvider router={router} />
      </RefinderyClientProvider>
    </QueryClientProvider>
  );
  return { router, history };
};

const searchInput = () => page.getByPlaceholder('Search your reading history…');

test('the search button stays disabled until a query is typed', async () => {
  const { client } = createFixture();
  renderSearchLab(client);
  const user = setupUser();

  const button = page.getByRole('button', { name: /search/i });
  await expect.element(button).toBeDisabled();
  await user.type(searchInput(), 'postgres');
  await expect.element(button).toBeEnabled();
});

test('running a search sends defaults, renders results, and records history', async () => {
  const { client, calls } = createFixture();
  const { router, history } = renderSearchLab(client);
  const user = setupUser();

  await user.type(searchInput(), 'postgres');
  await user.click(page.getByRole('button', { name: /search/i }));

  const link = page.getByRole('link', { name: 'Postgres tuning notes' });
  await expect.element(link).toBeVisible();
  expect(calls).toContainEqual({
    method: 'POST',
    path: '/v1/search',
    body: {
      query: 'postgres',
      k: 10,
      candidates: 100,
      rerank: true,
      filters: undefined,
    },
  });

  // The run is committed to the URL (deep-linkable).
  expect(router.state.location.search).toMatchObject({ query: 'postgres' });

  await expect.element(page.getByText('exact')).toBeVisible();
  await expect.element(page.getByText('databases')).toBeVisible();
  await expect.element(page.getByText('0.912')).toBeVisible();
  await expect
    .element(page.getByText('shared_buffers should be…'))
    .toBeVisible();
  await expect
    .element(page.getByText('Stage timing · query query-ab'))
    .toBeVisible();

  // Successful runs land in history.
  expect(history.map((entry) => entry.query)).toEqual(['postgres']);
  await expect.element(page.getByText('Recent searches')).toBeVisible();
});

test('a deep link with search params auto-runs once on mount', async () => {
  const { client, calls } = createFixture();
  renderSearchLab(client, '/search?query=preloaded&k=25');

  await expect
    .element(page.getByRole('link', { name: 'Postgres tuning notes' }))
    .toBeVisible();
  const searches = calls.filter((call) => call.path === '/v1/search');
  expect(searches).toHaveLength(1);
  expect(searches[0]?.body).toMatchObject({ query: 'preloaded', k: 25 });
});

test('the domain filter is forwarded in the request body', async () => {
  const { client, calls } = createFixture();
  renderSearchLab(client);
  const user = setupUser();

  await user.type(searchInput(), 'postgres');
  await user.type(page.getByPlaceholder('any'), 'example.com');
  await user.click(page.getByRole('button', { name: /search/i }));

  await expect
    .element(page.getByRole('link', { name: 'Postgres tuning notes' }))
    .toBeVisible();
  expect(calls.find((call) => call.path === '/v1/search')?.body).toMatchObject({
    filters: { domain: 'example.com' },
  });
});

test('empty results render the empty state', async () => {
  const { client } = createFixture({
    query_id: 'query-empty',
    results: [],
    offset: 0,
    has_more: false,
    suggestions: [],
    timing_ms: {},
  });
  renderSearchLab(client, '/search?query=nothing');

  await expect
    .element(page.getByText('No results for this query.'))
    .toBeVisible();
});

test('feedback buttons post the query and page ids', async () => {
  const { client, calls } = createFixture();
  renderSearchLab(client, '/search?query=postgres');
  const user = setupUser();

  await user.click(page.getByRole('button', { name: 'Relevant', exact: true }));

  expect(calls).toContainEqual({
    method: 'POST',
    path: '/v1/feedback',
    body: { query_id: 'query-abc-123', page_id: 'page-1', relevant: true },
  });
});
