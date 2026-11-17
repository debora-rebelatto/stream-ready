import { useState, useCallback } from 'react';
import type {
  WatchlistItem,
  WatchlistStats,
  StremioUser,
  AppSettings,
} from '../models';
import {
  authService,
  watchlistService,
  cinemetaService,
  systemService,
} from '../services';
import {
  isItemReady,
  isItemUnreleased,
  trackEvent,
  resetUser as resetAnalyticsUser,
  type EventSource,
} from '../utils';

const RATINGS_CACHE_KEY = 'stremio_ratings_cache';

const EMPTY_STATS: WatchlistStats = {
  total: 0,
  ready: 0,
  pending: 0,
  unreleased: 0,
  watched: 0,
};

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

export interface UseWatchlistControllerOptions {
  user: StremioUser | null;
  setUser: (user: StremioUser | null) => void;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export function useWatchlistController({
  user,
  setUser,
  showToast,
}: UseWatchlistControllerOptions) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [stats, setStats] = useState<WatchlistStats>(EMPTY_STATS);
  const [currentTab, setCurrentTab] = useState<
    'all' | 'ready' | 'pending' | 'unreleased' | 'watched'
  >('all');
  const [globalMinQuality, setGlobalMinQualityState] = useState<'1080p' | '4k'>('1080p');
  const [autoSyncWatched, setAutoSyncWatchedState] = useState<boolean>(false);
  const [trackWatchlistWatched, setTrackWatchlistWatchedState] = useState<boolean>(true);
  const [syncPreviouslyWatched, setSyncPreviouslyWatchedState] = useState<boolean>(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isSyncingWatched, setIsSyncingWatched] = useState(false);

  const applyLoadedSettings = useCallback((settings: AppSettings) => {
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
  }, []);

  const clearWatchlistState = useCallback(() => {
    setItems([]);
    setStats(EMPTY_STATS);
  }, []);

  const refreshWatchlist = useCallback(async () => {
    if (!user) {
      setItems([]);
      setStats(EMPTY_STATS);
      return;
    }

    setIsLoadingList(true);
    try {
      const res = await watchlistService.getWatchlist();
      if (res.requireAuth) {
        resetAnalyticsUser();
        setUser(null);
        authService.clearAuth();
        return;
      }
      const loadedItems = res.items || [];
      const storedRatings = getStoredRatings();
      let updatedRatings = false;

      const itemsWithRatings = loadedItems.map((item) => {
        const rating =
          item.imdbRating && String(item.imdbRating) !== 'N/A'
            ? String(item.imdbRating)
            : storedRatings[item.id] || '';
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
      const unreleased = unwatched.filter(
        (i) => !isItemReady(i, globalMinQuality) && isItemUnreleased(i)
      ).length;
      const pending = unwatched.filter(
        (i) => !isItemReady(i, globalMinQuality) && !isItemUnreleased(i)
      ).length;
      const watched = itemsWithRatings.filter((i) => Boolean(i.isWatched)).length;

      setItems(itemsWithRatings);
      setStats({
        total: itemsWithRatings.length,
        ready,
        pending,
        unreleased,
        watched,
      });

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
  }, [user, globalMinQuality, showToast, setUser]);

  const addItem = async (id: string, source: EventSource = 'manual') => {
    showToast('Adding movie and checking quality...', 'info');
    try {
      const res = await watchlistService.addItem(id);
      if (!res.success || res.error) {
        showToast(res.error || 'Error adding movie.', 'error');
        return;
      }
      const item = res.item;
      trackEvent('movie_added', {
        title: item.name,
        year: item.year ? String(item.year) : undefined,
        imdbId: id,
        source,
        isReady: Boolean(item.has1080pPlus),
      });
      if (item.has1080pPlus) {
        showToast(
          `🎉 "${item.name}" added! Already READY in good quality (${item.bestQuality})!`,
          'success'
        );
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
        trackEvent('movie_removed', { title: name, imdbId: id });
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
          showToast(
            `🎉 "${res.item.name}" is now available in good quality (${res.item.bestQuality})!`,
            'success'
          );
        } else {
          showToast(
            `Checked: ${res.item.name} (${res.item.bestQuality} - ${res.item.streamCount} sources)`,
            'info'
          );
        }
        await refreshWatchlist();
      }
    } catch {
      showToast('Failed to recheck quality.', 'error');
    }
  };

  const recheckAll = async () => {
    trackEvent('recheck_all_triggered', { totalItems: items.length });
    setIsCheckingAll(true);
    showToast('Rechecking sources for all watchlist movies...', 'info');
    try {
      const res = await watchlistService.recheckAll(true);
      if (res.success) {
        trackEvent('recheck_all_triggered', {
          totalItems: items.length,
          newlyReady: res.newlyReady || 0,
        });
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
    trackEvent('quality_setting_updated', { minQuality: quality, scope: 'global' });
    setGlobalMinQualityState(quality);
    try {
      await systemService.saveSettings({ minQuality: quality });
      showToast(`🎯 Quality preference set to ${quality.toUpperCase()}!`, 'success');
      await refreshWatchlist();
    } catch {
      showToast('Failed to save quality preference.', 'error');
    }
  };

  const setAutoSyncWatched = async (enabled: boolean) => {
    trackEvent('sync_setting_updated', { setting: 'autoSyncWatched', enabled });
    setAutoSyncWatchedState(enabled);
    try {
      await systemService.saveSettings({ autoSyncWatched: enabled });
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
    trackEvent('sync_setting_updated', { setting: 'trackWatchlistWatched', enabled });
    setTrackWatchlistWatchedState(enabled);
    try {
      await systemService.saveSettings({ trackWatchlistWatched: enabled });
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
    trackEvent('sync_setting_updated', { setting: 'syncPreviouslyWatched', enabled });
    setSyncPreviouslyWatchedState(enabled);
    try {
      await systemService.saveSettings({ syncPreviouslyWatched: enabled });
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
        trackEvent('movie_watched_toggled', { isWatched: watched, imdbId: id });
        setItems((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, isWatched: watched, watchedAt: watched ? new Date().toISOString() : null }
              : i
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
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, minQuality } : i)));
        if (res.stats) setStats(res.stats);
        trackEvent('quality_setting_updated', {
          minQuality: minQuality || 'default',
          scope: 'item',
          imdbId: id,
        });
        showToast(
          `Target quality set to ${minQuality ? minQuality.toUpperCase() : 'Default'}.`,
          'success'
        );
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

  return {
    items,
    setItems,
    stats,
    setStats,
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
    setItemMinQuality,
    recheckItem,
    recheckAll,
    applyLoadedSettings,
    clearWatchlistState,
  };
}
