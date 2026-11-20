import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WatchlistItem, WatchlistStats } from '../models';
import { watchlistService, cinemetaService, authService } from '../services';
import {
  enrichWatchlistItem,
  computeWatchlistStats,
  trackEvent,
  safeStorage,
  type EventSource,
  resetUser as resetAnalyticsUser,
} from '../utils';
import { useToastStore } from './toastStore';
import { useAuthStore } from './authStore';
import { useSettingsStore } from './settingsStore';

const RATINGS_CACHE_KEY = 'stremio_ratings_cache';

const EMPTY_STATS: WatchlistStats = {
  total: 0,
  ready: 0,
  pending: 0,
  unreleased: 0,
  watched: 0,
};

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

export interface WatchlistStoreState {
  items: WatchlistItem[];
  stats: WatchlistStats;
  currentTab: 'all' | 'ready' | 'pending' | 'unreleased' | 'watched';
  isLoadingList: boolean;
  isCheckingAll: boolean;
  isSyncingWatched: boolean;

  setCurrentTab: (tab: 'all' | 'ready' | 'pending' | 'unreleased' | 'watched') => void;
  setItems: (
    itemsOrFn: WatchlistItem[] | ((prev: WatchlistItem[]) => WatchlistItem[])
  ) => void;
  clearWatchlistState: () => void;
  recomputeItemsEnrichment: (quality: '1080p' | '4k') => void;
  updateItemsAfterListDeletion: (deletedListId: string, deletedSet: Set<string>) => void;
  updateItemLists: (itemId: string, listIds: string[]) => void;
  refreshWatchlist: () => Promise<void>;
  addItem: (id: string, source?: EventSource) => Promise<boolean>;
  removeItem: (id: string, name: string) => Promise<boolean>;
  recheckItem: (id: string) => Promise<void>;
  recheckAll: () => Promise<void>;
  markWatched: (id: string, watched: boolean) => Promise<void>;
  syncWatchedFromStremio: () => Promise<void>;
}

export const useWatchlistStore = create<WatchlistStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      stats: EMPTY_STATS,
      currentTab: 'all',
      isLoadingList: false,
      isCheckingAll: false,
      isSyncingWatched: false,

      setCurrentTab: (tab) => {
        set({ currentTab: tab });
      },

      setItems: (itemsOrFn) => {
        const quality = useSettingsStore.getState().globalMinQuality;
        set((state) => {
          const nextItems =
            typeof itemsOrFn === 'function' ? itemsOrFn(state.items) : itemsOrFn;
          return {
            items: nextItems,
            stats: computeWatchlistStats(nextItems, quality),
          };
        });
      },

      clearWatchlistState: () => {
        set({ items: [], stats: EMPTY_STATS });
      },

      recomputeItemsEnrichment: (quality: '1080p' | '4k') => {
        set((state) => {
          const enriched = state.items.map((item) => enrichWatchlistItem(item, quality));
          return {
            items: enriched,
            stats: computeWatchlistStats(enriched, quality),
          };
        });
      },

      updateItemsAfterListDeletion: (deletedListId: string, deletedSet: Set<string>) => {
        const quality = useSettingsStore.getState().globalMinQuality;
        set((state) => {
          const updated = state.items
            .filter((item) => {
              if (deletedSet.has(item.id)) return false;
              if (Array.isArray(item.customLists) && item.customLists.includes(deletedListId)) {
                const remaining = item.customLists.filter((lid) => lid !== deletedListId);
                return remaining.length > 0;
              }
              return true;
            })
            .map((item) => {
              if (Array.isArray(item.customLists) && item.customLists.includes(deletedListId)) {
                return {
                  ...item,
                  customLists: item.customLists.filter((lid) => lid !== deletedListId),
                };
              }
              return item;
            });

          return {
            items: updated,
            stats: computeWatchlistStats(updated, quality),
          };
        });
      },

      updateItemLists: (itemId: string, listIds: string[]) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, customLists: listIds } : item
          ),
        }));
      },

      refreshWatchlist: async () => {
        const user = useAuthStore.getState().user;
        const quality = useSettingsStore.getState().globalMinQuality;
        const showToast = useToastStore.getState().showToast;

        if (!user) {
          set({ items: [], stats: EMPTY_STATS });
          return;
        }

        set({ isLoadingList: true });
        try {
          const res = await watchlistService.getWatchlist();
          if (res.requireAuth) {
            resetAnalyticsUser();
            useAuthStore.getState().setUser(null);
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
            return enrichWatchlistItem(withRating, quality);
          });

          if (updatedRatings) {
            saveStoredRatings(storedRatings);
          }

          set({
            items: itemsWithRatings,
            stats: computeWatchlistStats(itemsWithRatings, quality),
          });

          // Background fill missing ratings
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
                get().setItems((prev) =>
                  prev.map((i) =>
                    currentStored[i.id] && !i.imdbRating
                      ? { ...i, imdbRating: currentStored[i.id] }
                      : i
                  )
                );
              }
            })();
          }
        } catch {
          showToast('Error loading watchlist items.', 'error');
        } finally {
          set({ isLoadingList: false });
        }
      },

      addItem: async (id: string, source: EventSource = 'manual'): Promise<boolean> => {
        const showToast = useToastStore.getState().showToast;
        const quality = useSettingsStore.getState().globalMinQuality;

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
          const enriched = enrichWatchlistItem(withRating, quality);

          get().setItems((prev) => [enriched, ...prev.filter((i) => i.id !== enriched.id)]);

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
      },

      removeItem: async (id: string, name: string): Promise<boolean> => {
        const showToast = useToastStore.getState().showToast;
        try {
          const res = await watchlistService.removeItem(id);
          if (res.success) {
            trackEvent('movie_removed', { title: name, imdbId: id });
            showToast(`"${name}" removed from watchlist.`, 'info');
            get().setItems((prev) => prev.filter((i) => i.id !== id));
            return true;
          }
          showToast('Error removing item.', 'error');
          return false;
        } catch {
          showToast('Error removing item.', 'error');
          return false;
        }
      },

      recheckItem: async (id: string) => {
        const showToast = useToastStore.getState().showToast;
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
            await get().refreshWatchlist();
          }
        } catch {
          showToast('Failed to recheck quality.', 'error');
        }
      },

      recheckAll: async () => {
        const showToast = useToastStore.getState().showToast;
        const items = get().items;
        trackEvent('recheck_all_triggered', { totalItems: items.length });
        set({ isCheckingAll: true });
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
            await get().refreshWatchlist();
          }
        } catch {
          showToast('Error checking movies.', 'error');
        } finally {
          set({ isCheckingAll: false });
        }
      },

      markWatched: async (id: string, watched: boolean) => {
        const showToast = useToastStore.getState().showToast;
        const quality = useSettingsStore.getState().globalMinQuality;
        try {
          const res = await watchlistService.setWatched(id, watched);
          if (res.success) {
            trackEvent('movie_watched_toggled', { isWatched: watched, imdbId: id });
            get().setItems((prev) =>
              prev.map((i) =>
                i.id === id
                  ? enrichWatchlistItem(
                      {
                        ...i,
                        isWatched: watched,
                        watchedAt: watched ? new Date().toISOString() : null,
                      },
                      quality
                    )
                  : i
              )
            );
            showToast(
              watched
                ? '👁️ Movie moved to Watched History.'
                : '↩️ Movie restored to active watchlist.',
              'success'
            );
          }
        } catch {
          showToast('Failed to update watched status.', 'error');
        }
      },

      syncWatchedFromStremio: async () => {
        const showToast = useToastStore.getState().showToast;
        const quality = useSettingsStore.getState().globalMinQuality;
        set({ isSyncingWatched: true });
        showToast('Syncing watched history from Stremio...', 'info');
        try {
          const res = await watchlistService.syncWatchedFromStremio();
          if (res.success) {
            if (res.items) {
              get().setItems(res.items.map((item) => enrichWatchlistItem(item, quality)));
            }
            const { newlyAdded, newlyMarked, totalWatched } = res.result || {};
            const count = (newlyAdded || 0) + (newlyMarked || 0);
            if (count > 0) {
              showToast(`🎉 Synced ${count} watched movies from your Stremio account!`, 'success');
            } else {
              showToast(
                `Watched history is already up to date (${totalWatched || 0} movies).`,
                'info'
              );
            }
          } else {
            showToast('Failed to sync watched history.', 'error');
          }
        } catch {
          showToast('Error communicating with server.', 'error');
        } finally {
          set({ isSyncingWatched: false });
        }
      },
    }),
    {
      name: 'stremio_watchlist_preferences',
      partialize: (state) => ({ currentTab: state.currentTab }),
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
