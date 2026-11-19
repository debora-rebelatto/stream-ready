import { createContext, useContext } from 'react';
import type {
  WatchlistItem,
  WatchlistStats,
  StremioUser,
  ToastMessage,
  CustomList,
  CuratedList,
} from '../models';

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
  ) => Promise<void>;
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

export const AuthContext = createContext<AuthContextType | null>(null);
export const WatchlistContext = createContext<WatchlistContextType | null>(null);
export const ToastContext = createContext<ToastContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AppProvider');
  return ctx;
};

export const useWatchlist = () => {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within AppProvider');
  return ctx;
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
