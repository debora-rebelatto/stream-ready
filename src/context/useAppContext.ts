import { createContext, useContext } from 'react';
import type { WatchlistItem, WatchlistStats, StremioUser, ToastMessage } from '../types';

export interface AuthContextType {
  user: StremioUser | null;
  isLoading: boolean;
  loginWithCreds: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithKey: (authKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  installToAccount: () => Promise<{ success: boolean; message?: string; error?: string }>;
}

export interface WatchlistContextType {
  items: WatchlistItem[];
  stats: WatchlistStats;
  currentTab: 'all' | 'ready' | 'pending' | 'unreleased' | 'watched';
  setCurrentTab: (tab: 'all' | 'ready' | 'pending' | 'unreleased' | 'watched') => void;
  globalMinQuality: '1080p' | '4k';
  setGlobalMinQuality: (quality: '1080p' | '4k') => Promise<void>;
  isLoading: boolean;
  isCheckingAll: boolean;
  refreshWatchlist: () => Promise<void>;
  addItem: (id: string) => Promise<void>;
  removeItem: (id: string, name: string) => Promise<void>;
  markWatched: (id: string, watched: boolean) => Promise<void>;
  setItemMinQuality: (id: string, minQuality: '1080p' | '4k' | null) => Promise<void>;
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
