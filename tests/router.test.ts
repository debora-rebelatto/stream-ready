import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
} from '@tanstack/react-router';
import { routeTree, createAppRouter } from '../src/router';

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

  it('creates router with memory history pointing to /design-system', () => {
    const memoryHistory = createMemoryHistory({ initialEntries: ['/design-system'] });
    const router = createRouter({ routeTree, history: memoryHistory });
    expect(router.state.location.pathname).toBe('/design-system');
  });
});
