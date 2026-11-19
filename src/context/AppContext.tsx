import React, { useState, useEffect, useCallback } from 'react';
import type { ToastMessage } from '../models';
import {
  useAuthController,
  useWatchlistController,
  useCustomListsController,
} from '../controllers';
import { AuthContext, WatchlistContext, ToastContext, useToast } from './useAppContext';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => {
        const filtered = prev.filter((t) => t.message !== message);
        return [...filtered, { id, message, type }];
      });

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();

  const {
    user,
    setUser,
    isLoadingAuth,
    loadedSettings,
    loginWithCreds,
    loginWithKey,
    logout,
    deleteAccount,
    installToAccount,
  } = useAuthController({ showToast });

  const {
    items,
    setItems,
    stats,
    currentTab,
    setCurrentTab,
    globalMinQuality,
    setGlobalMinQuality,
    autoSyncWatched,
    setAutoSyncWatched,
    trackWatchlistWatched,
    setTrackWatchlistWatched,
    syncPreviouslyWatched,
    setSyncPreviouslyWatched,
    isLoadingList,
    isCheckingAll,
    isSyncingWatched,
    refreshWatchlist,
    syncWatchedFromStremio,
    addItem,
    removeItem,
    markWatched,
    recheckItem,
    recheckAll,
    applyLoadedSettings,
    clearWatchlistState,
  } = useWatchlistController({ user, setUser, showToast });

  const {
    customLists,
    activeCustomListId,
    setActiveCustomListId,
    isListsLoading,
    curatedLists,
    isCuratedListsLoading,
    fetchCustomLists,
    fetchCuratedLists,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    setItemCustomLists,
    toggleItemCustomList,
    addCuratedList,
    clearCustomListsState,
  } = useCustomListsController({
    user,
    items,
    setItems,
    refreshWatchlist,
    showToast,
  });

  useEffect(() => {
    if (loadedSettings) {
      applyLoadedSettings(loadedSettings);
    }
  }, [loadedSettings, applyLoadedSettings]);

  useEffect(() => {
    fetchCuratedLists();
    if (user) {
      refreshWatchlist();
      fetchCustomLists();
    } else {
      clearWatchlistState();
      clearCustomListsState();
    }
  }, [
    user,
    refreshWatchlist,
    fetchCustomLists,
    fetchCuratedLists,
    clearWatchlistState,
    clearCustomListsState,
  ]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoadingAuth,
        loginWithCreds,
        loginWithKey,
        logout,
        deleteAccount,
        installToAccount,
      }}
    >
      <WatchlistContext.Provider
        value={{
          items,
          stats,
          currentTab,
          setCurrentTab,
          customLists,
          activeCustomListId,
          setActiveCustomListId,
          createCustomList,
          updateCustomList,
          deleteCustomList,
          setItemCustomLists,
          toggleItemCustomList,
          isListsLoading,
          curatedLists,
          fetchCuratedLists,
          addCuratedList,
          isCuratedListsLoading,
          globalMinQuality,
          setGlobalMinQuality,
          autoSyncWatched,
          setAutoSyncWatched,
          trackWatchlistWatched,
          setTrackWatchlistWatched,
          syncPreviouslyWatched,
          setSyncPreviouslyWatched,
          isLoading: isLoadingList,
          isCheckingAll,
          isSyncingWatched,
          refreshWatchlist,
          syncWatchedFromStremio,
          addItem,
          removeItem,
          markWatched,
          recheckItem,
          recheckAll,
        }}
      >
        {children}
      </WatchlistContext.Provider>
    </AuthContext.Provider>
  );
};
