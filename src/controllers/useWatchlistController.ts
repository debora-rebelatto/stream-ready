import { useState, useCallback, useMemo } from 'react';
import type {
  WatchlistItem,
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
  enrichWatchlistItem,
  computeWatchlistStats,
  trackEvent,
  resetUser as resetAnalyticsUser,
  safeStorage,
  type EventSource,
} from '../utils';

const RATINGS_CACHE_KEY = 'stremio_ratings_cache';

function getStoredRatings(): Record<string, string> {
  const raw = safeStorage.get(RATINGS_CACHE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredRatings(ratings: Record<string, string>) {
  safeStorage.set(RATINGS_CACHE_KEY, JSON.stringify(ratings));
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
  const [currentTab, setCurrentTab] = useState<
    'all' | 'ready' | 'pending' | 'unreleased' | 'watched'
  >('all');
  const [globalMinQuality, setGlobalMinQualityState] = useState<'1080p' | '4k'>('1080p');
  const stats = useMemo(
    () => computeWatchlistStats(items, globalMinQuality),
    [items, globalMinQuality]
  );
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
  }, []);

  const refreshWatchlist = useCallback(async () => {
    if (!user) {
      setItems([]);
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
        const withRating = rating ? { ...item, imdbRating: rating } : item;
        return enrichWatchlistItem(withRating, globalMinQuality);
      });

      if (updatedRatings) {
        saveStoredRatings(storedRatings);
      }

      setItems(itemsWithRatings);

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
            } catch (err) {
              console.warn('[Watchlist] Rating lookup skipped:', err);
            }
          }
          if (hasNew) {
            saveStoredRatings(currentStored);
            setItems((prev) =>
              prev.map((i) =>
                currentStored[i.id]
                  ? enrichWatchlistItem({ ...i, imdbRating: currentStored[i.id] }, globalMinQuality)
                  : i
              )
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

  const addItem = async (id: string, source: EventSource = 'manual'): Promise<boolean> => {
    showToast('Adding movie and checking quality...', 'info');
    try {
      const res = await watchlistService.addItem(id);
      if (!res.success || res.error || !res.item) {
        showToast(res.error || 'Error adding movie.', 'error');
        return false;
      }
      const item = res.item;
      const storedRatings = getStoredRatings();
      const rating =
        item.imdbRating && String(item.imdbRating) !== 'N/A'
          ? String(item.imdbRating)
          : storedRatings[item.id] || '';
      if (item.imdbRating && String(item.imdbRating) !== 'N/A' && !storedRatings[item.id]) {
        storedRatings[item.id] = String(item.imdbRating);
        saveStoredRatings(storedRatings);
      }
      const withRating = rating ? { ...item, imdbRating: rating } : item;
      const enriched = enrichWatchlistItem(withRating, globalMinQuality);
      setItems((prev) => [enriched, ...prev.filter((i) => i.id !== enriched.id)]);

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
      return true;
    } catch {
      showToast('Error communicating with server.', 'error');
      return false;
    }
  };

  const removeItem = async (id: string, name: string): Promise<boolean> => {
    try {
      const res = await watchlistService.removeItem(id);
      if (res.success) {
        trackEvent('movie_removed', { title: name, imdbId: id });
        showToast(`"${name}" removed from watchlist.`, 'info');
        setItems((prev) => prev.filter((i) => i.id !== id));
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
    setItems((prev) => prev.map((item) => enrichWatchlistItem(item, quality)));
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
              ? enrichWatchlistItem(
                  {
                    ...i,
                    isWatched: watched,
                    watchedAt: watched ? new Date().toISOString() : null,
                  },
                  globalMinQuality
                )
              : i
          )
        );
        showToast(
          watched ? '👁️ Movie moved to Watched History.' : '↩️ Movie restored to active watchlist.',
          'success'
        );
      }
    } catch {
      showToast('Failed to update watched status.', 'error');
    }
  };

  const syncWatchedFromStremio = async () => {
    setIsSyncingWatched(true);
    showToast('Syncing watched history from Stremio...', 'info');
    try {
      const res = await watchlistService.syncWatchedFromStremio();
      if (res.success) {
        if (res.items) {
          setItems(res.items.map((item) => enrichWatchlistItem(item, globalMinQuality)));
        }
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
  };
}
