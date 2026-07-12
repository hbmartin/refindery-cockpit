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
  JobsPage,
  jobsSearchSchema,
  RefinderyClientProvider,
} from '@/modules/refindery/presentation';
import {
  createRefineryApi,
  type RefineryHttpClient,
} from '@/modules/refindery/testing';

type Job = {
  job_id: string;
  kind: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

const deadJob = (): Job => ({
  job_id: 'job-dead-1',
  kind: 'embed',
  status: 'dead',
  attempts: 3,
  max_attempts: 3,
  last_error: 'boom: provider 500',
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:01:00Z',
});

const runningJob = (): Job => ({
  job_id: 'job-run-1',
  kind: 'ingest',
  status: 'running',
  attempts: 1,
  max_attempts: 3,
  last_error: null,
  created_at: '2026-07-12T00:00:00Z',
  updated_at: '2026-07-12T00:02:00Z',
});

/** Stateful fake: retry mutates the job list, so the invalidation-driven
 * refetch is proven observably (the dead-letter section disappears). */
const createFixture = (scopes: string[]) => {
  const jobs = [deadJob(), runningJob()];
  const calls: { method: string; path: string }[] = [];
  const client: RefineryHttpClient = {
    async get<T>(path: string): Promise<T> {
      calls.push({ method: 'GET', path });
      if (path.startsWith('/v1/whoami')) {
        return { name: 'operator', scopes } as T;
      }
      if (path.startsWith('/v1/jobs')) {
        return { jobs: [...jobs] } as T;
      }
      throw new Error(`Unexpected GET ${path}`);
    },
    async post<T>(path: string): Promise<T> {
      calls.push({ method: 'POST', path });
      if (path === '/v1/jobs/job-dead-1/retry') {
        const job = jobs.find((j) => j.job_id === 'job-dead-1');
        if (job) job.status = 'pending';
        return { ...deadJob(), status: 'pending' } as T;
      }
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

/** JobsPage resolves its URL state via getRouteApi('/_shell/jobs'), so the
 * memory router must mirror the real route ids. */
const renderJobsPage = (client: RefineryHttpClient, initialEntry = '/jobs') => {
  const rootRoute = createRootRoute();
  const shellRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: '_shell',
  });
  const jobsRoute = createRoute({
    getParentRoute: () => shellRoute,
    path: 'jobs',
    validateSearch: jobsSearchSchema,
    component: JobsPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([shellRoute.addChildren([jobsRoute])]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  const tokenStore = {
    subscribe: () => () => undefined,
    getSnapshot: () => 'admin-token',
    getServerSnapshot: () => null,
    set: () => undefined,
    peek: () => 'admin-token',
  };
  const searchHistory = {
    subscribe: () => () => undefined,
    getSnapshot: () => [],
    getServerSnapshot: () => [],
    record: () => undefined,
    clear: () => undefined,
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
  return router;
};

test('renders dead-letter and active sections with an enabled retry for write tokens', async () => {
  const { client } = createFixture(['read', 'write']);
  renderJobsPage(client);

  await expect.element(page.getByText('Dead letter · 1')).toBeVisible();
  await expect.element(page.getByText('Active & recent · 1')).toBeVisible();
  await expect.element(page.getByText('boom: provider 500')).toBeVisible();
  await expect.element(page.getByText('3/3')).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: /retry/i }))
    .toBeEnabled();
});

test('retry posts to the API and the refetched list drops the dead-letter section', async () => {
  const { client, calls } = createFixture(['read', 'write']);
  renderJobsPage(client);
  const user = setupUser();

  await expect.element(page.getByText('Dead letter · 1')).toBeVisible();
  await user.click(page.getByRole('button', { name: /retry/i }));

  expect(calls).toContainEqual({
    method: 'POST',
    path: '/v1/jobs/job-dead-1/retry',
  });
  await expect.element(page.getByText('Active & recent · 2')).toBeVisible();
  expect(page.getByText('Dead letter · 1').query()).toBeNull();
});

test('read-only tokens see a disabled retry button', async () => {
  const { client } = createFixture(['read']);
  renderJobsPage(client);

  await expect.element(page.getByText('Dead letter · 1')).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: /retry/i }))
    .toBeDisabled();
});

test('the status filter narrows the list and lives in the URL', async () => {
  const { client } = createFixture(['read', 'write']);
  const router = renderJobsPage(client);
  const user = setupUser();

  await expect.element(page.getByText('Dead letter · 1')).toBeVisible();
  await user.click(page.getByRole('tab', { name: 'Dead' }));

  await expect.element(page.getByText('Dead · 1')).toBeVisible();
  expect(page.getByText('Active & recent · 1').query()).toBeNull();
  expect(router.state.location.search).toMatchObject({ status: 'dead' });

  await user.click(page.getByRole('tab', { name: 'All' }));
  await expect.element(page.getByText('Active & recent · 1')).toBeVisible();
  expect(router.state.location.search).toMatchObject({});
});
