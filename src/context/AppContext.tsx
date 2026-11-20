import React, { useEffect } from 'react';
import {
  useAuthStore,
  useWatchlistStore,
  useCustomListStore,
} from '../stores';

/**
 * Lightweight application bootstrap component.
 * Initiates session check and background catalog synchronization on startup.
 */
export const AppInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAuthStore((s) => s.user);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const fetchCuratedLists = useCustomListStore((s) => s.fetchCuratedLists);
  const fetchCustomLists = useCustomListStore((s) => s.fetchCustomLists);
  const refreshWatchlist = useWatchlistStore((s) => s.refreshWatchlist);

  useEffect(() => {
    checkAuth();
    fetchCuratedLists();
  }, [checkAuth, fetchCuratedLists]);

  useEffect(() => {
    if (user) {
      refreshWatchlist();
      fetchCustomLists();
    }
  }, [user, refreshWatchlist, fetchCustomLists]);

  return <>{children}</>;
};

/**
 * Backward-compatible pass-through wrapper for legacy tests and providers.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

/**
 * Backward-compatible pass-through wrapper for legacy AppProvider consumers.
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppInitializer>{children}</AppInitializer>
);
