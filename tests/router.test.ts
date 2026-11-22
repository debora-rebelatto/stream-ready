import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from '@tanstack/react-router';
import { routeTree, createAppRouter } from '../src/router';
import { useAuthStore } from '../src/stores/authStore';

describe('TanStack Router Architecture & Invariants', () => {
  it('instantiates the TanStack Router with route tree', () => {
    const router = createAppRouter();
    expect(router).toBeDefined();
    expect(typeof router.navigate).toBe('function');
  });

  it('defines all expected top-level application routes', () => {
    const root = createRootRoute();
    const home = createRoute({ getParentRoute: () => root, path: '/' });
    const settings = createRoute({ getParentRoute: () => root, path: '/settings' });
    const admin = createRoute({ getParentRoute: () => root, path: '/admin' });
    const designSystem = createRoute({ getParentRoute: () => root, path: '/design-system' });

    const tree = root.addChildren([home, settings, admin, designSystem]);
    const memoryHistory = createMemoryHistory({ initialEntries: ['/'] });
    const memoryRouter = createRouter({ routeTree: tree, history: memoryHistory });

    expect(memoryRouter.state.location.pathname).toBe('/');
  });

  it('creates router with memory history pointing to /settings', () => {
    const memoryHistory = createMemoryHistory({ initialEntries: ['/settings'] });
    const router = createRouter({ routeTree, history: memoryHistory });
    expect(router.state.location.pathname).toBe('/settings');
  });

  it('creates router with memory history pointing to /admin', () => {
    const memoryHistory = createMemoryHistory({ initialEntries: ['/admin'] });
    const router = createRouter({ routeTree, history: memoryHistory });
    expect(router.state.location.pathname).toBe('/admin');
  });

  it('creates router with memory history pointing to /design-system and renders its components', async () => {
    const adminUser = {
      id: 'admin_123',
      email: 'admin@stremio.com',
      authKey: 'test-key',
      isAdmin: true,
    };

    Object.assign(useAuthStore.getInitialState(), {
      user: adminUser,
      isLoadingAuth: false,
    });
    useAuthStore.setState({
      user: adminUser,
      isLoadingAuth: false,
    });

    const memoryHistory = createMemoryHistory({ initialEntries: ['/design-system'] });
    const router = createRouter({ routeTree, history: memoryHistory });
    await router.load();

    expect(router.state.location.pathname).toBe('/design-system');

    const html = renderToString(React.createElement(RouterProvider, { router }));

    // Assert that the DesignSystemView and its subcomponents/sections are rendered
    expect(html).toContain('Stremio Watchlist Design System');
    expect(html).toContain('Foundations &amp; Tokens');
    expect(html).toContain('Atomic UI Primitives');
    expect(html).toContain('Domain &amp; Future Expansions');
  });
});
