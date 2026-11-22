import React, { createContext } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type {
  WatchlistItem,
  WatchlistStats,
  StremioUser,
  ToastMessage,
  CustomList,
  CuratedList,
} from '../models';
import {
  useAuthStore,
  useWatchlistStore,
  useCustomListStore,
  useSettingsStore,
  useToastStore,
} from '../stores';

export interface AuthContextType {
  user: StremioUser | null;
  isLoading: boolean;
  loginWithCreds: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithKey: (authKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  installToAccount: () => Promise<{ success: boolean; message?: string; error?: string }>;
  markOnboardingCompleted: (hasMovies?: boolean) => Promise<boolean>;
}

export interface WatchlistContextType {
  items: WatchlistItem[];
  stats: WatchlistStats;
  currentTab: 'all' | 'ready' | 'pending' | 'unreleased' | 'watched';
  setCurrentTab: (tab: 'all' | 'ready' | 'pending' | 'unreleased' | 'watched') => void;
  customLists: CustomList[];
  activeCustomListId: string | null;
  setActiveCustomListId: (id: string | null) => void;
  createCustomList: (name: string, emoji?: string) => Promise<boolean>;
  updateCustomList: (id: string, name: string, emoji?: string) => Promise<boolean>;
  deleteCustomList: (id: string) => Promise<boolean>;
  setItemCustomLists: (itemId: string, listIds: string[]) => Promise<void>;
  toggleItemCustomList: (itemId: string, listId: string) => Promise<void>;
  isListsLoading: boolean;
  curatedLists: CuratedList[];
  fetchCuratedLists: () => Promise<void>;
  addCuratedList: (id: string) => Promise<boolean>;
  isCuratedListsLoading: boolean;
  globalMinQuality: '1080p' | '4k';
  setGlobalMinQuality: (quality: '1080p' | '4k') => Promise<void>;
  autoSyncWatched: boolean;
  setAutoSyncWatched: (enabled: boolean) => Promise<void>;
  trackWatchlistWatched: boolean;
  setTrackWatchlistWatched: (enabled: boolean) => Promise<void>;
  syncPreviouslyWatched: boolean;
  setSyncPreviouslyWatched: (enabled: boolean) => Promise<void>;
  isLoading: boolean;
  isCheckingAll: boolean;
  refreshWatchlist: () => Promise<void>;
  addItem: (
    id: string,
    source?: 'search' | 'recommendations' | 'curated_list' | 'manual'
  ) => Promise<boolean>;
  removeItem: (id: string, name: string) => Promise<boolean>;
  markWatched: (id: string, watched: boolean) => Promise<void>;
  syncWatchedFromStremio: () => Promise<void>;
  isSyncingWatched: boolean;
  recheckItem: (id: string) => Promise<void>;
  recheckAll: () => Promise<void>;
}

export interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

// React Context compatibility instances
export const AuthContext = createContext<AuthContextType | null>(null);
export const WatchlistContext = createContext<WatchlistContextType | null>(null);
export const ToastContext = createContext<ToastContextType | null>(null);

function isReactActive(): boolean {
  try {
    const internals =
      (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE ||
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    return Boolean(internals?.H || internals?.ReactCurrentDispatcher?.current);
  } catch {
    return false;
  }
}

/**
 * Backward-compatible facade for useAuth() backed by atomic useAuthStore
 */
export const useAuth = (): AuthContextType => {
  const inReact = isReactActive();

  const authState = inReact
    ? useAuthStore(
        useShallow((s) => ({
          user: s.user,
          isLoading: s.isLoadingAuth,
          loginWithCreds: s.loginWithCreds,
          loginWithKey: s.loginWithKey,
          logout: s.logout,
          deleteAccount: s.deleteAccount,
          installToAccount: s.installToAccount,
          markOnboardingCompleted: s.markOnboardingCompleted,
        }))
      )
    : {
        user: useAuthStore.getState().user,
        isLoading: useAuthStore.getState().isLoadingAuth,
        loginWithCreds: useAuthStore.getState().loginWithCreds,
        loginWithKey: useAuthStore.getState().loginWithKey,
        logout: useAuthStore.getState().logout,
        deleteAccount: useAuthStore.getState().deleteAccount,
        installToAccount: useAuthStore.getState().installToAccount,
        markOnboardingCompleted: useAuthStore.getState().markOnboardingCompleted,
      };

  return authState;
};

/**
 * Backward-compatible facade for useToast() backed by atomic useToastStore
 */
export const useToast = (): ToastContextType => {
  const inReact = isReactActive();

  const toastState = inReact
    ? useToastStore(
        useShallow((s) => ({
          toasts: s.toasts,
          showToast: s.showToast,
          removeToast: s.removeToast,
        }))
      )
    : {
        toasts: useToastStore.getState().toasts,
        showToast: useToastStore.getState().showToast,
        removeToast: useToastStore.getState().removeToast,
      };

  return toastState;
};

/**
 * Backward-compatible facade for useWatchlist() backed by domain stores
 */
export const useWatchlist = (): WatchlistContextType => {
  const inReact = isReactActive();

  const watchlistSlice = inReact
    ? useWatchlistStore(
        useShallow((s) => ({
          items: s.items,
          stats: s.stats,
          currentTab: s.currentTab,
          setCurrentTab: s.setCurrentTab,
          isLoading: s.isLoadingList,
          isCheckingAll: s.isCheckingAll,
          isSyncingWatched: s.isSyncingWatched,
          refreshWatchlist: s.refreshWatchlist,
          addItem: s.addItem,
          removeItem: s.removeItem,
          markWatched: s.markWatched,
          recheckItem: s.recheckItem,
          recheckAll: s.recheckAll,
          syncWatchedFromStremio: s.syncWatchedFromStremio,
        }))
      )
    : {
        items: useWatchlistStore.getState().items,
        stats: useWatchlistStore.getState().stats,
        currentTab: useWatchlistStore.getState().currentTab,
        setCurrentTab: useWatchlistStore.getState().setCurrentTab,
        isLoading: useWatchlistStore.getState().isLoadingList,
        isCheckingAll: useWatchlistStore.getState().isCheckingAll,
        isSyncingWatched: useWatchlistStore.getState().isSyncingWatched,
        refreshWatchlist: useWatchlistStore.getState().refreshWatchlist,
        addItem: useWatchlistStore.getState().addItem,
        removeItem: useWatchlistStore.getState().removeItem,
        markWatched: useWatchlistStore.getState().markWatched,
        recheckItem: useWatchlistStore.getState().recheckItem,
        recheckAll: useWatchlistStore.getState().recheckAll,
        syncWatchedFromStremio: useWatchlistStore.getState().syncWatchedFromStremio,
      };

  const customListSlice = inReact
    ? useCustomListStore(
        useShallow((s) => ({
          customLists: s.customLists,
          activeCustomListId: s.activeCustomListId,
          setActiveCustomListId: s.setActiveCustomListId,
          createCustomList: s.createCustomList,
          updateCustomList: s.updateCustomList,
          deleteCustomList: s.deleteCustomList,
          setItemCustomLists: s.setItemCustomLists,
          toggleItemCustomList: s.toggleItemCustomList,
          isListsLoading: s.isListsLoading,
          curatedLists: s.curatedLists,
          fetchCuratedLists: s.fetchCuratedLists,
          addCuratedList: s.addCuratedList,
          isCuratedListsLoading: s.isCuratedListsLoading,
        }))
      )
    : {
        customLists: useCustomListStore.getState().customLists,
        activeCustomListId: useCustomListStore.getState().activeCustomListId,
        setActiveCustomListId: useCustomListStore.getState().setActiveCustomListId,
        createCustomList: useCustomListStore.getState().createCustomList,
        updateCustomList: useCustomListStore.getState().updateCustomList,
        deleteCustomList: useCustomListStore.getState().deleteCustomList,
        setItemCustomLists: useCustomListStore.getState().setItemCustomLists,
        toggleItemCustomList: useCustomListStore.getState().toggleItemCustomList,
        isListsLoading: useCustomListStore.getState().isListsLoading,
        curatedLists: useCustomListStore.getState().curatedLists,
        fetchCuratedLists: useCustomListStore.getState().fetchCuratedLists,
        addCuratedList: useCustomListStore.getState().addCuratedList,
        isCuratedListsLoading: useCustomListStore.getState().isCuratedListsLoading,
      };

  const settingsSlice = inReact
    ? useSettingsStore(
        useShallow((s) => ({
          globalMinQuality: s.globalMinQuality,
          setGlobalMinQuality: s.setGlobalMinQuality,
          autoSyncWatched: s.autoSyncWatched,
          setAutoSyncWatched: s.setAutoSyncWatched,
          trackWatchlistWatched: s.trackWatchlistWatched,
          setTrackWatchlistWatched: s.setTrackWatchlistWatched,
          syncPreviouslyWatched: s.syncPreviouslyWatched,
          setSyncPreviouslyWatched: s.setSyncPreviouslyWatched,
        }))
      )
    : {
        globalMinQuality: useSettingsStore.getState().globalMinQuality,
        setGlobalMinQuality: useSettingsStore.getState().setGlobalMinQuality,
        autoSyncWatched: useSettingsStore.getState().autoSyncWatched,
        setAutoSyncWatched: useSettingsStore.getState().setAutoSyncWatched,
        trackWatchlistWatched: useSettingsStore.getState().trackWatchlistWatched,
        setTrackWatchlistWatched: useSettingsStore.getState().setTrackWatchlistWatched,
        syncPreviouslyWatched: useSettingsStore.getState().syncPreviouslyWatched,
        setSyncPreviouslyWatched: useSettingsStore.getState().setSyncPreviouslyWatched,
      };

  return {
    ...watchlistSlice,
    ...customListSlice,
    ...settingsSlice,
  };
};
