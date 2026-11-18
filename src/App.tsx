import React from 'react';
import { useAppController } from './controllers';
import { LandingPageView, UserDashboardView } from './views';
import { ToastContainer } from './components';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAppController();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0c0d14] text-center px-4">
        <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-gray-300">Checking Stremio session...</p>
        <p className="text-xs text-gray-500 mt-1">Loading your profile and quality tracker</p>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? <UserDashboardView /> : <LandingPageView />}
      <ToastContainer />
    </>
  );
};
