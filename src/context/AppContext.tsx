import React, { useState, useEffect, useCallback } from 'react';
import type { WatchlistItem, WatchlistStats, StremioUser, ToastMessage, CustomList, CuratedList } from '../types';
import { authService } from '../services/authService';
import { watchlistService } from '../services/watchlistService';
import { cinemetaService } from '../services/cinemetaService';
import { api } from '../lib/api';
import { isItemReady, isItemUnreleased } from '../lib/utils';
import { AuthContext, WatchlistContext, ToastContext, useToast } from './useAppContext';

const RATINGS_CACHE_KEY = 'stremio_ratings_cache';

function getStoredRatings(): Record<string, string> {
  try {
    const raw = localStorage.getItem(RATINGS_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredRatings(ratings: Record<string, string>) {
  try {
    localStorage.setItem(RATINGS_CACHE_KEY, JSON.stringify(ratings));
  } catch {
    // ignore
  }
}

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
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeCustomListId, setActiveCustomListId] = useState<string | null>(null);
  const [isListsLoading, setIsListsLoading] = useState(false);
  const [curatedLists, setCuratedLists] = useState<CuratedList[]>([]);
  const [isCuratedListsLoading, setIsCuratedListsLoading] = useState(false);
  const [globalMinQuality, setGlobalMinQualityState] = useState<'1080p' | '4k'>('1080p');
  const [autoSyncWatched, setAutoSyncWatchedState] = useState<boolean>(false);
  const [trackWatchlistWatched, setTrackWatchlistWatchedState] = useState<boolean>(true);
  const [syncPreviouslyWatched, setSyncPreviouslyWatchedState] = useState<boolean>(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isSyncingWatched, setIsSyncingWatched] = useState(false);

  const fetchCustomLists = useCallback(async () => {
    if (!user) {
      setCustomLists([]);
      return;
    }
    setIsListsLoading(true);
    try {
      const res = await watchlistService.getCustomLists();
      if (res.success && Array.isArray(res.lists)) {
        setCustomLists(res.lists);
      }
    } catch {
      // ignore
    } finally {
      setIsListsLoading(false);
    }
  }, [user]);

  const fetchCuratedLists = useCallback(async () => {
    setIsCuratedListsLoading(true);
    try {
      const res = await watchlistService.getCuratedLists();
      if (res.success && Array.isArray(res.lists)) {
        setCuratedLists(res.lists);
      }
    } catch {
      // ignore
    } finally {
      setIsCuratedListsLoading(false);
    }
  }, []);

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
          if (typeof settings?.autoSyncWatched === 'boolean') {
            setAutoSyncWatchedState(settings.autoSyncWatched);
          }
          if (typeof settings?.trackWatchlistWatched === 'boolean') {
            setTrackWatchlistWatchedState(settings.trackWatchlistWatched);
          }
          if (typeof settings?.syncPreviouslyWatched === 'boolean') {
            setSyncPreviouslyWatchedState(settings.syncPreviouslyWatched);
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
      const storedRatings = getStoredRatings();
      let updatedRatings = false;

      const itemsWithRatings = loadedItems.map((item) => {
        const rating = (item.imdbRating && String(item.imdbRating) !== 'N/A') ? String(item.imdbRating) : (storedRatings[item.id] || '');
        if (item.imdbRating && !storedRatings[item.id]) {
          storedRatings[item.id] = String(item.imdbRating);
          updatedRatings = true;
        }
        return rating ? { ...item, imdbRating: rating } : item;
      });

      if (updatedRatings) {
        saveStoredRatings(storedRatings);
      }

      const unwatched = itemsWithRatings.filter((i) => !i.isWatched);
      const ready = unwatched.filter((i) => isItemReady(i, globalMinQuality)).length;
      const unreleased = unwatched.filter((i) => !isItemReady(i, globalMinQuality) && isItemUnreleased(i)).length;
      const pending = unwatched.filter((i) => !isItemReady(i, globalMinQuality) && !isItemUnreleased(i)).length;
      const watched = itemsWithRatings.filter((i) => Boolean(i.isWatched)).length;

      setItems(itemsWithRatings);
      setStats({
        total: itemsWithRatings.length,
        ready,
        pending,
        unreleased,
        watched,
      });

      // Background rating enrichment for any items missing ratings
      const missingRatings = itemsWithRatings.filter((i) => !i.imdbRating && i.id);
      if (missingRatings.length > 0) {
        (async () => {
          let hasNew = false;
          const currentStored = getStoredRatings();
          for (const item of missingRatings) {
            try {
              const meta = await cinemetaService.getMeta(item.type || 'movie', item.id);
              if (meta?.imdbRating) {
                currentStored[item.id] = String(meta.imdbRating);
                hasNew = true;
              }
            } catch {
              // ignore
            }
          }
          if (hasNew) {
            saveStoredRatings(currentStored);
            setItems((prev) =>
              prev.map((i) => (currentStored[i.id] ? { ...i, imdbRating: currentStored[i.id] } : i))
            );
          }
        })();
      }
    } catch {
      showToast('Error loading watchlist items.', 'error');
    } finally {
      setIsLoadingList(false);
    }
  }, [user, globalMinQuality, showToast]);

  useEffect(() => {
    fetchCuratedLists();
    if (user) {
      refreshWatchlist();
      fetchCustomLists();
    } else {
      setItems([]);
      setCustomLists([]);
      setActiveCustomListId(null);
      setStats({ total: 0, ready: 0, pending: 0, unreleased: 0, watched: 0 });
    }
  }, [user, refreshWatchlist, fetchCustomLists, fetchCuratedLists]);

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
        showToast('🎉 Addon installed to Stremio! Remember to search and add your movies here on the website.', 'success');
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

  const removeItem = async (id: string, name: string): Promise<boolean> => {
    try {
      const res = await watchlistService.removeItem(id);
      if (res.success) {
        showToast(`"${name}" removed from watchlist.`, 'info');
        setItems((prev) => prev.filter((i) => i.id !== id));
        setStats(res.stats);
        return true;
      }
      showToast('Error removing item.', 'error');
      return false;
    } catch {
      showToast('Error removing item.', 'error');
      return false;
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
    showToast('Rechecking sources for all watchlist movies...', 'info');
    try {
      const res = await watchlistService.recheckAll(true);
      if (res.success) {
        if (res.newlyReady > 0) {
          showToast(`🎉 ${res.newlyReady} movie(s) are now ready in good quality!`, 'success');
        } else {
          showToast('Check completed. Watchlist status updated.', 'info');
        }
        await refreshWatchlist();
      }
    } catch {
      showToast('Error checking movies.', 'error');
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

  const setAutoSyncWatched = async (enabled: boolean) => {
    setAutoSyncWatchedState(enabled);
    try {
      await api.saveSettings({ autoSyncWatched: enabled });
      showToast(
        enabled
          ? 'Auto-sync for watched movies enabled.'
          : 'Auto-sync for watched movies disabled.',
        'success'
      );
    } catch {
      showToast('Failed to save sync preference.', 'error');
    }
  };

  const setTrackWatchlistWatched = async (enabled: boolean) => {
    setTrackWatchlistWatchedState(enabled);
    try {
      await api.saveSettings({ trackWatchlistWatched: enabled });
      showToast(
        enabled
          ? 'Watchlist tracking enabled (watched after adding).'
          : 'Watchlist tracking disabled.',
        'success'
      );
    } catch {
      showToast('Failed to save settings.', 'error');
    }
  };

  const setSyncPreviouslyWatched = async (enabled: boolean) => {
    setSyncPreviouslyWatchedState(enabled);
    try {
      await api.saveSettings({ syncPreviouslyWatched: enabled });
      showToast(
        enabled
          ? 'Sync for previously watched movies enabled.'
          : 'Sync for previously watched movies disabled.',
        'success'
      );
    } catch {
      showToast('Failed to save settings.', 'error');
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

  const createCustomList = async (name: string, emoji = '🎬'): Promise<boolean> => {
    try {
      const res = await watchlistService.createCustomList(name, emoji);
      if (res.success && res.list) {
        setCustomLists((prev) => [...prev, res.list]);
        showToast(`📁 List "${res.list.name}" created successfully!`, 'success');
        return true;
      } else {
        showToast(res.error || 'Failed to create list.', 'error');
        return false;
      }
    } catch {
      showToast('Failed to create list.', 'error');
      return false;
    }
  };

  const updateCustomList = async (id: string, name: string, emoji?: string): Promise<boolean> => {
    try {
      const res = await watchlistService.updateCustomList(id, name, emoji);
      if (res.success && res.list) {
        setCustomLists((prev) => prev.map((l) => (l.id === id ? { ...l, ...res.list } : l)));
        showToast('List updated successfully!', 'success');
        return true;
      } else {
        showToast(res.error || 'Failed to update list.', 'error');
        return false;
      }
    } catch {
      showToast('Failed to update list.', 'error');
      return false;
    }
  };

  const deleteCustomList = async (id: string): Promise<boolean> => {
    try {
      const res = await watchlistService.deleteCustomList(id);
      if (res.success) {
        setCustomLists((prev) => prev.filter((l) => l.id !== id));
        if (activeCustomListId === id) {
          setActiveCustomListId(null);
        }
        const deletedSet = new Set(res.deletedItemIds || []);
        // Remove movies that belonged to this deleted list from the watchlist
        setItems((prev) =>
          prev
            .filter((item) => {
              if (deletedSet.has(item.id)) return false;
              if (Array.isArray(item.customLists) && item.customLists.includes(id)) {
                const remaining = item.customLists.filter((lid) => lid !== id);
                return remaining.length > 0;
              }
              return true;
            })
            .map((item) => {
              if (Array.isArray(item.customLists) && item.customLists.includes(id)) {
                return {
                  ...item,
                  customLists: item.customLists.filter((lid) => lid !== id),
                };
              }
              return item;
            })
        );
        showToast('List and its movies removed successfully.', 'info');
        return true;
      } else {
        showToast(res.error || 'Failed to delete list.', 'error');
        return false;
      }
    } catch {
      showToast('Failed to delete list.', 'error');
      return false;
    }
  };

  const setItemCustomLists = async (itemId: string, listIds: string[]) => {
    try {
      const res = await watchlistService.setItemCustomLists(itemId, listIds);
      if (res.success) {
        setItems((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, customLists: listIds } : item))
        );
        await fetchCustomLists();
        showToast('Movie lists updated!', 'success');
      } else {
        showToast(res.error || 'Failed to update movie lists.', 'error');
      }
    } catch {
      showToast('Failed to update movie lists.', 'error');
    }
  };

  const toggleItemCustomList = async (itemId: string, listId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const currentLists = item.customLists || [];
    const exists = currentLists.includes(listId);
    const updatedLists = exists
      ? currentLists.filter((id) => id !== listId)
      : [...currentLists, listId];

    await setItemCustomLists(itemId, updatedLists);
  };

  const addCuratedList = async (id: string): Promise<boolean> => {
    if (!user) {
      showToast('Please sign in with Stremio to add standard lists.', 'error');
      return false;
    }
    try {
      const res = await watchlistService.addCuratedList(id);
      if (res.success && res.list) {
        showToast(`Added "${res.list.name || 'Standard List'}" (${res.addedMoviesCount ?? 0} new movies)!`, 'success');

        // Optimistically update customLists and curatedLists immediately for instant UI response
        setCustomLists((prev) => {
          if (prev.some((cl) => cl.id === res.list.id || cl.name.trim().toLowerCase() === res.list.name.trim().toLowerCase())) {
            return prev;
          }
          return [...prev, res.list];
        });

        setCuratedLists((prev) =>
          prev.map((cl) => (cl.id === id ? { ...cl, isAdded: true } : cl))
        );

        // Refresh full data in the background without freezing the UI modal
        Promise.all([
          refreshWatchlist(),
          fetchCustomLists(),
          fetchCuratedLists()
        ]).catch(() => {});

        return true;
      } else {
        showToast(res.error || 'Failed to add standard list.', 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err.message || 'Error adding standard list.', 'error');
      return false;
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
