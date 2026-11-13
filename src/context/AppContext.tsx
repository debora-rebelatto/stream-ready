import React, { useState, useEffect, useCallback } from 'react';
import type { WatchlistItem, WatchlistStats, StremioUser, ToastMessage } from '../types';
import { authService } from '../services/authService';
import { watchlistService } from '../services/watchlistService';
import { api } from '../lib/api';
import { isItemReady, isItemUnreleased } from '../lib/utils';
import { AuthContext, WatchlistContext, ToastContext, useToast } from './useAppContext';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => {
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<StremioUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState<WatchlistStats>({ total: 0, ready: 0, pending: 0, unreleased: 0, watched: 0 });
  const [currentTab, setCurrentTab] = useState<'all' | 'ready' | 'pending' | 'unreleased' | 'watched'>('all');
  const [globalMinQuality, setGlobalMinQualityState] = useState<'1080p' | '4k'>('1080p');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isSyncingWatched, setIsSyncingWatched] = useState(false);

  const checkAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const res = await authService.getStatus();
      if (res.loggedIn && res.user) {
        setUser(res.user);
        try {
          const settings = await api.getSettings();
          if (settings?.minQuality === '4k' || settings?.minQuality === '1080p') {
            setGlobalMinQualityState(settings.minQuality);
          }
        } catch {}
      } else if (res.isUnauthorized) {
        setUser(null);
        authService.clearAuth();
      } else {
        // Temporary server/network error: keep token in localStorage so user isn't logged out
        setUser(null);
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
      setStats({ total: 0, ready: 0, pending: 0, unreleased: 0, watched: 0 });
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
      const unwatched = loadedItems.filter((i) => !i.isWatched);
      const ready = unwatched.filter((i) => isItemReady(i, globalMinQuality)).length;
      const unreleased = unwatched.filter((i) => !isItemReady(i, globalMinQuality) && isItemUnreleased(i)).length;
      const pending = unwatched.filter((i) => !isItemReady(i, globalMinQuality) && !isItemUnreleased(i)).length;
      const watched = loadedItems.filter((i) => Boolean(i.isWatched)).length;

      setItems(loadedItems);
      setStats({
        total: unwatched.length,
        ready,
        pending,
        unreleased,
        watched,
      });
    } catch {
      showToast('Error loading watchlist items.', 'error');
    } finally {
      setIsLoadingList(false);
    }
  }, [user, globalMinQuality, showToast]);

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

  const setGlobalMinQuality = async (quality: '1080p' | '4k') => {
    setGlobalMinQualityState(quality);
    try {
      await api.saveSettings({ minQuality: quality });
      showToast(`🎯 Quality preference set to ${quality.toUpperCase()}!`, 'success');
      await refreshWatchlist();
    } catch {
      showToast('Failed to save quality preference.', 'error');
    }
  };

  const markWatched = async (id: string, watched: boolean) => {
    try {
      const res = await watchlistService.setWatched(id, watched);
      if (res.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, isWatched: watched, watchedAt: watched ? new Date().toISOString() : null } : i
          )
        );
        if (res.stats) setStats(res.stats);
        showToast(
          watched ? '👁️ Movie moved to Watched History.' : '↩️ Movie restored to active watchlist.',
          'success'
        );
      }
    } catch {
      showToast('Failed to update watched status.', 'error');
    }
  };

  const setItemMinQuality = async (id: string, minQuality: '1080p' | '4k' | null) => {
    try {
      const res = await watchlistService.setItemMinQuality(id, minQuality);
      if (res.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === id ? { ...i, minQuality } : i))
        );
        if (res.stats) setStats(res.stats);
        showToast(`Target quality set to ${minQuality ? minQuality.toUpperCase() : 'Default'}.`, 'success');
      }
    } catch {
      showToast('Failed to update item target quality.', 'error');
    }
  };

  const syncWatchedFromStremio = async () => {
    setIsSyncingWatched(true);
    showToast('Syncing watched history from Stremio...', 'info');
    try {
      const res = await watchlistService.syncWatchedFromStremio();
      if (res.success) {
        if (res.items) setItems(res.items);
        if (res.stats) setStats(res.stats);
        const { newlyAdded, newlyMarked, totalWatched } = res.result || {};
        const count = (newlyAdded || 0) + (newlyMarked || 0);
        if (count > 0) {
          showToast(`🎉 Synced ${count} watched movies from your Stremio account!`, 'success');
        } else {
          showToast(`Watched history is already up to date (${totalWatched || 0} movies).`, 'info');
        }
      } else {
        showToast('Failed to sync watched history.', 'error');
      }
    } catch {
      showToast('Error communicating with server.', 'error');
    } finally {
      setIsSyncingWatched(false);
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
          globalMinQuality,
          setGlobalMinQuality,
          isLoading: isLoadingList,
          isCheckingAll,
          isSyncingWatched,
          refreshWatchlist,
          syncWatchedFromStremio,
          addItem,
          removeItem,
          markWatched,
          setItemMinQuality,
          recheckItem,
          recheckAll,
        }}
      >
        {children}
      </WatchlistContext.Provider>
    </AuthContext.Provider>
  );
};
