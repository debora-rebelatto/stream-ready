import React from 'react';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  useNavigate,
  type Router,
} from '@tanstack/react-router';
import { useAuth } from './context/useAppContext';
import {
  LandingPageView,
  UserDashboardView,
  SettingsPageView,
  AdminDashboardView,
  DesignSystemView,
} from './views';
import { ToastContainer, LoadingState } from './components';

const SessionLoadingFallback: React.FC = () => (
  <LoadingState
    variant="fullscreen"
    title="Checking Stremio session..."
    description="Loading your profile and quality tracker"
  />
);

// Root Layout Component
const RootLayout: React.FC = () => {
  return (
    <>
      <Outlet />
      <ToastContainer />
    </>
  );
};

// Root Route
export const rootRoute = createRootRoute({
  component: RootLayout,
});

// Home Route ('/') - Shows LandingPage for unauthenticated users, UserDashboard for authenticated
const HomeRouteComponent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <SessionLoadingFallback />;
  }

  return user ? <UserDashboardView /> : <LandingPageView />;
};

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomeRouteComponent,
});

// Settings Route ('/settings')
const SettingsRouteComponent: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <SessionLoadingFallback />;
  }

  if (!user) {
    navigate({ to: '/' });
    return null;
  }

  return <SettingsPageView onBack={() => navigate({ to: '/' })} />;
};

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsRouteComponent,
});

// Admin Route ('/admin')
const AdminRouteComponent: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <SessionLoadingFallback />;
  }

  if (!user || !user.isAdmin) {
    navigate({ to: '/' });
    return null;
  }

  return <AdminDashboardView onBack={() => navigate({ to: '/' })} />;
};

export const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminRouteComponent,
});

// Design System Route ('/design-system')
const DesignSystemRouteComponent: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <SessionLoadingFallback />;
  }

  if (!user || !user.isAdmin) {
    navigate({ to: '/' });
    return null;
  }

  return <DesignSystemView onBack={() => navigate({ to: '/' })} />;
};

export const designSystemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/design-system',
  component: DesignSystemRouteComponent,
});

// Route Tree
export const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  adminRoute,
  designSystemRoute,
]);

// App Router Factory
export function createAppRouter(): Router<typeof routeTree> {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
  });
}

// Router Type Registration for TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
