import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { cn } from '@/platform/lib/tailwind/utils';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/platform/components/ui/sidebar';
import { ThemeSwitcher } from '@/platform/components/ui/theme-switcher';

import { ClientOnly } from './client-only';
import { HealthDot } from './health-dot';
import { NAV_ITEMS } from './nav-items';
import { TokenIdentity } from './token-identity';
import { useCockpitAlerts } from '../use-alerts';

const isActivePath = (pathname: string, to: string): boolean =>
  to === '/'
    ? pathname === '/'
    : pathname === to || pathname.startsWith(`${to}/`);

/** App shell: fixed left nav with alert badges + top bar (health, identity, theme). */
export function CockpitShell({ children }: { children: ReactNode }) {
  return (
    <ClientOnly
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
          Loading cockpit…
        </div>
      }
    >
      <CockpitShellInner>{children}</CockpitShellInner>
    </ClientOnly>
  );
}

function CockpitShellInner({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { byLens } = useCockpitAlerts();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link to="/" className="flex items-center gap-2 px-2 py-1.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              R
            </span>
            <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              Refindery Cockpit
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Lenses</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map((item) => {
                  const active = isActivePath(location.pathname, item.to);
                  const alerts = byLens.get(item.id) ?? [];
                  const critical = alerts.some(
                    (a) => a.severity === 'critical'
                  );
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={active}
                        tooltip={item.label}
                        render={<Link to={item.to} />}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {alerts.length > 0 ? (
                        <SidebarMenuBadge
                          className={cn(
                            critical
                              ? 'bg-status-negative text-status-negative-foreground'
                              : 'bg-status-warning text-status-warning-foreground'
                          )}
                        >
                          {alerts.length}
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="px-2 py-1 text-2xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            localhost · single user
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <HealthDot />
          <div className="ml-auto flex items-center gap-3">
            <TokenIdentity />
            <ThemeSwitcher iconOnly />
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
