import type { QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { type ReactNode } from 'react';
import '@/platform/lib/temporal/polyfill';
import '@/platform/lib/i18n';
import '@fontsource-variable/inter';

import { QueryClientProvider } from '@/platform/lib/tanstack-query/provider';

import { Sonner } from '@/platform/components/ui/sonner';

import { refineryApi } from '@/modules/refindery/infrastructure/api';
import { searchHistoryStore } from '@/modules/refindery/infrastructure/search-history-store';
import { tokenStore } from '@/modules/refindery/infrastructure/token-store';
import { RefinderyClientProvider } from '@/modules/refindery/presentation';
import { readCspNonceFromMeta } from '@/platform/http/csp-nonce';

export const Providers = (props: {
  children: ReactNode;
  client: QueryClient;
  cspNonce?: string;
  forcedTheme?: string;
}) => {
  const cspNonce = props.cspNonce ?? readCspNonceFromMeta();

  return (
    <ThemeProvider
      attribute="class"
      storageKey="theme"
      disableTransitionOnChange
      nonce={cspNonce}
      forcedTheme={props.forcedTheme}
    >
      <QueryClientProvider client={props.client}>
        <RefinderyClientProvider
          api={refineryApi}
          tokenStore={tokenStore}
          searchHistory={searchHistoryStore}
        >
          <ProviderContent>{props.children}</ProviderContent>
        </RefinderyClientProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

function ProviderContent(props: { children: ReactNode }) {
  return (
    <>
      {props.children}
      <Sonner />
    </>
  );
}
