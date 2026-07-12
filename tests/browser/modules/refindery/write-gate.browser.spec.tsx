import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { page, render, setupUser } from '@tests/utils';
import { expect, test, vi } from 'vitest';

import { Button } from '@/platform/components/ui/button';

import { RefinderyClientProvider } from '@/modules/refindery/presentation';
import {
  createRefineryApi,
  type RefineryHttpClient,
  WriteGate,
} from '@/modules/refindery/testing';

test('read-only write controls cannot be activated by pointer or keyboard', async () => {
  const onClick = vi.fn();
  const user = setupUser();
  const client: RefineryHttpClient = {
    async get<T>(): Promise<T> {
      return { name: 'reader', scopes: ['read'] } as T;
    },
    async post<T>(): Promise<T> {
      return undefined as T;
    },
    async delete<T>(): Promise<T> {
      return undefined as T;
    },
    async metricsText() {
      return '';
    },
  };
  const tokenStore = {
    subscribe: () => () => undefined,
    getSnapshot: () => 'read-token',
    getServerSnapshot: () => null,
    set: () => undefined,
    peek: () => 'read-token',
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
        <WriteGate>
          <Button onClick={onClick}>Delete</Button>
        </WriteGate>
      </RefinderyClientProvider>
    </QueryClientProvider>
  );

  const button = page.getByRole('button', { name: 'Delete' });
  await expect.element(button).toBeDisabled();
  await user.click(button).catch(() => undefined);
  await user.tab();
  await user.keyboard('{Enter}');
  expect(onClick).not.toHaveBeenCalled();
});

test('read-only gate also blocks non-form clickables like links', async () => {
  const onClick = vi.fn();
  const user = setupUser();
  const client: RefineryHttpClient = {
    async get<T>(): Promise<T> {
      return { name: 'reader', scopes: ['read'] } as T;
    },
    async post<T>(): Promise<T> {
      return undefined as T;
    },
    async delete<T>(): Promise<T> {
      return undefined as T;
    },
    async metricsText() {
      return '';
    },
  };
  const tokenStore = {
    subscribe: () => () => undefined,
    getSnapshot: () => 'read-token',
    getServerSnapshot: () => null,
    set: () => undefined,
    peek: () => 'read-token',
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
        <WriteGate>
          <a href="#danger" onClick={onClick}>
            Purge
          </a>
        </WriteGate>
      </RefinderyClientProvider>
    </QueryClientProvider>
  );

  const link = page.getByText('Purge');
  await expect.element(link).toBeVisible();
  // pointer-events: none makes the link unclickable; the click times out.
  await user.click(link, { timeout: 1000 }).catch(() => undefined);
  expect(onClick).not.toHaveBeenCalled();
});
