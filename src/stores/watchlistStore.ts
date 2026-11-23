import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { WatchlistItem, WatchlistStats } from '../models';
import { watchlistService, cinemetaService, authService } from '../services';
import {
  trackEvent,
  safeStorage,
  type EventSource,
  resetUser as resetAnalyticsUser,
} from '../utils';
import { useToastStore } from './toastStore';
import { useAuthStore } from './authStore';

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

function attachCachedRatings(loadedItems: WatchlistItem[]): WatchlistItem[] {
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

  return itemsWithRatings;
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
    itemsOrFn: WatchlistItem[] | ((prev: WatchlistItem[]) => WatchlistItem[]),
    nextStats?: WatchlistStats
  ) => void;
  applyServerWatchlistSnapshot: (items: WatchlistItem[], stats?: WatchlistStats) => void;
  clearWatchlistState: () => void;
  updateItemsAfterListDeletion: (
    deletedListId: string,
    deletedSet: Set<string>,
    nextStats?: WatchlistStats
  ) => void;
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

      setItems: (itemsOrFn, nextStats) => {
        set((state) => {
          const nextItems =
            typeof itemsOrFn === 'function' ? itemsOrFn(state.items) : itemsOrFn;
          return {
            items: nextItems,
            ...(nextStats ? { stats: nextStats } : {}),
          };
        });
      },

      applyServerWatchlistSnapshot: (serverItems, serverStats) => {
        const itemsWithRatings = attachCachedRatings(serverItems || []);
        set((state) => ({
          items: itemsWithRatings,
          stats: serverStats ?? state.stats,
        }));
      },

      clearWatchlistState: () => {
        set({ items: [], stats: EMPTY_STATS });
      },

      updateItemsAfterListDeletion: (
        deletedListId: string,
        deletedSet: Set<string>,
        nextStats?: WatchlistStats
      ) => {
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
            ...(nextStats ? { stats: nextStats } : {}),
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

          const itemsWithRatings = attachCachedRatings(res.items || []);

          set({
            items: itemsWithRatings,
            stats: res.stats || EMPTY_STATS,
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

        showToast('Adding movie and checking quality...', 'info');
        try {
          const res = await watchlistService.addItem(id);
          if (!res.success || res.error || !res.item) {
            showToast(res.error || 'Error adding movie.', 'error');
            return false;
          }
          const [item] = attachCachedRatings([res.item]);

          get().setItems(
            (prev) => [item, ...prev.filter((i) => i.id !== item.id)],
            res.stats
          );

          const isReady = Boolean(item.computed?.isReady ?? item.has1080pPlus);

          trackEvent('movie_added', {
            title: item.name,
            year: item.year ? String(item.year) : undefined,
            imdbId: id,
            source,
            isReady,
          });

          if (isReady) {
            showToast(
              `"${item.name}" added! Already READY in good quality (${item.computed?.qualityLabel || item.bestQuality})!`,
              'success'
            );
          } else {
            showToast(`"${item.name}" added! Waiting for good quality release.`, 'info');
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
            get().setItems((prev) => prev.filter((i) => i.id !== id), res.stats);
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
                `"${res.item.name}" is now available in good quality (${res.item.bestQuality})!`,
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
              showToast(`${res.newlyReady} movie(s) are now ready in good quality!`, 'success');
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
        try {
          const res = await watchlistService.setWatched(id, watched);
          if (res.success) {
            trackEvent('movie_watched_toggled', { isWatched: watched, imdbId: id });
            get().setItems(
              (prev) =>
                prev.map((i) =>
                  i.id === id
                    ? res.item
                      ? { ...res.item, imdbRating: res.item.imdbRating || i.imdbRating }
                      : {
                          ...i,
                          isWatched: watched,
                          watchedAt: watched ? new Date().toISOString() : null,
                        }
                    : i
                ),
              res.stats
            );
            showToast(
              watched
                ? 'Movie moved to Watched History.'
                : 'Movie restored to active watchlist.',
              'success'
            );
          }
        } catch {
          showToast('Failed to update watched status.', 'error');
        }
      },

      syncWatchedFromStremio: async () => {
        const showToast = useToastStore.getState().showToast;
        set({ isSyncingWatched: true });
        showToast('Syncing watched history from Stremio...', 'info');
        try {
          const res = await watchlistService.syncWatchedFromStremio();
          if (res.success) {
            if (res.items) {
              get().applyServerWatchlistSnapshot(res.items, res.stats);
            } else if (res.stats) {
              set({ stats: res.stats });
            }
            const { newlyAdded, newlyMarked, totalWatched } = res.result || {};
            const count = (newlyAdded || 0) + (newlyMarked || 0);
            if (count > 0) {
              showToast(`Synced ${count} watched movies from your Stremio account!`, 'success');
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
