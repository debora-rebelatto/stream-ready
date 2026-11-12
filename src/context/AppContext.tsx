import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { WatchlistItem, WatchlistStats, StremioUser, ToastMessage } from '../types';
import { authService } from '../services/authService';
import { watchlistService } from '../services/watchlistService';
import { isItemUnreleased } from '../lib/utils';

interface AuthContextType {
  user: StremioUser | null;
  isLoading: boolean;
  loginWithCreds: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithKey: (authKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  installToAccount: () => Promise<{ success: boolean; message?: string; error?: string }>;
}

interface WatchlistContextType {
  items: WatchlistItem[];
  stats: WatchlistStats;
  currentTab: 'all' | 'ready' | 'pending' | 'unreleased';
  setCurrentTab: (tab: 'all' | 'ready' | 'pending' | 'unreleased') => void;
  isLoading: boolean;
  isCheckingAll: boolean;
  refreshWatchlist: () => Promise<void>;
  addItem: (id: string) => Promise<void>;
  removeItem: (id: string, name: string) => Promise<void>;
  recheckItem: (id: string) => Promise<void>;
  recheckAll: () => Promise<void>;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);
const WatchlistContext = createContext<WatchlistContextType | null>(null);
const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
      // deduplicate exact identical message if active
      const filtered = prev.filter((t) => t.message !== message);
      return [...filtered, { id, message, type }];
    });

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<StremioUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState<WatchlistStats>({ total: 0, ready: 0, pending: 0, unreleased: 0 });
  const [currentTab, setCurrentTab] = useState<'all' | 'ready' | 'pending' | 'unreleased'>('all');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  const checkAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const res = await authService.getStatus();
      if (res.loggedIn && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
        authService.clearAuth();
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const refreshWatchlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      setStats({ total: 0, ready: 0, pending: 0, unreleased: 0 });
      return;
    }

    setIsLoadingList(true);
    try {
      const res = await watchlistService.getWatchlist();
      if (res.requireAuth) {
        setUser(null);
        authService.clearAuth();
        return;
      }
      const loadedItems = res.items || [];
      const ready = loadedItems.filter((i) => i.has1080pPlus).length;
      const unreleased = loadedItems.filter((i) => !i.has1080pPlus && isItemUnreleased(i)).length;
      const pending = loadedItems.filter((i) => !i.has1080pPlus && !isItemUnreleased(i)).length;

      setItems(loadedItems);
      setStats({
        total: loadedItems.length,
        ready,
        pending,
        unreleased,
      });
    } catch (err) {
      showToast('Error loading watchlist items.', 'error');
    } finally {
      setIsLoadingList(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      refreshWatchlist();
    } else {
      setItems([]);
      setStats({ total: 0, ready: 0, pending: 0, unreleased: 0 });
    }
  }, [user, refreshWatchlist]);

  const loginWithCreds = async (email: string, pass: string) => {
    try {
      const res = await authService.login({ email, password: pass });
      if (res.success && res.authKey && res.user) {
        authService.setAuthKey(res.authKey, res.user.email);
        setUser(res.user);
        showToast(`🎉 Welcome, ${res.user.email}!`, 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const loginWithKey = async (authKey: string) => {
    try {
      const res = await authService.login({ authKey });
      if (res.success && res.authKey && res.user) {
        authService.setAuthKey(res.authKey, res.user.email);
        setUser(res.user);
        showToast(`🎉 Connected as ${res.user.email}!`, 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid AuthKey' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setItems([]);
    setStats({ total: 0, ready: 0, pending: 0, unreleased: 0 });
    showToast('Signed out successfully.', 'info');
  };

  const installToAccount = async () => {
    try {
      const res = await authService.installToAccount();
      if (res.success) {
        showToast('🎉 Success! The addon was installed directly on your Stremio account!', 'success');
        return { success: true };
      }
      showToast(res.error || 'Failed to install to account.', 'error');
      return { success: false, error: res.error };
    } catch (err: any) {
      showToast('Error communicating with server.', 'error');
      return { success: false, error: err.message };
    }
  };

  const addItem = async (id: string) => {
    showToast('Adding movie and checking quality...', 'info');
    try {
      const res = await watchlistService.addItem(id);
      if (!res.success || res.error) {
        showToast(res.error || 'Error adding movie.', 'error');
        return;
      }
      const item = res.item;
      if (item.has1080pPlus) {
        showToast(`🎉 "${item.name}" added! Already READY in good quality (${item.bestQuality})!`, 'success');
      } else {
        showToast(`⏳ "${item.name}" added! Waiting for good quality release.`, 'info');
      }
      await refreshWatchlist();
    } catch {
      showToast('Error communicating with server.', 'error');
    }
  };

  const removeItem = async (id: string, name: string) => {
    if (!window.confirm(`Remove "${name}" from your watchlist?`)) return;
    try {
      const res = await watchlistService.removeItem(id);
      if (res.success) {
        showToast(`"${name}" removed from watchlist.`, 'info');
        setItems((prev) => prev.filter((i) => i.id !== id));
        setStats(res.stats);
      }
    } catch {
      showToast('Error removing item.', 'error');
    }
  };

  const recheckItem = async (id: string) => {
    try {
      const res = await watchlistService.recheckItem(id);
      if (res.success && res.item) {
        if (res.becameReady) {
          showToast(`🎉 "${res.item.name}" is now available in good quality (${res.item.bestQuality})!`, 'success');
        } else {
          showToast(`Checked: ${res.item.name} (${res.item.bestQuality} - ${res.item.streamCount} sources)`, 'info');
        }
        await refreshWatchlist();
      }
    } catch {
      showToast('Failed to recheck quality.', 'error');
    }
  };

  const recheckAll = async () => {
    setIsCheckingAll(true);
    showToast('Rechecking sources for all pending movies...', 'info');
    try {
      const res = await watchlistService.recheckAll(false);
      if (res.success) {
        if (res.newlyReady > 0) {
          showToast(`🎉 ${res.newlyReady} movie(s) are now ready in good quality!`, 'success');
        } else {
          showToast('Check completed. No new good quality releases found yet.', 'info');
        }
        await refreshWatchlist();
      }
    } catch {
      showToast('Error checking pending movies.', 'error');
    } finally {
      setIsCheckingAll(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: isLoadingAuth,
        loginWithCreds,
        loginWithKey,
        logout,
        installToAccount,
      }}
    >
      <WatchlistContext.Provider
        value={{
          items,
          stats,
          currentTab,
          setCurrentTab,
          isLoading: isLoadingList,
          isCheckingAll,
          refreshWatchlist,
          addItem,
          removeItem,
          recheckItem,
          recheckAll,
        }}
      >
        {children}
      </WatchlistContext.Provider>
    </AuthContext.Provider>
  );
};

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
