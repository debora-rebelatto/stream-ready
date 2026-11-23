import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CustomList, CuratedList } from '../models';
import { customListService } from '../services';
import { trackEvent } from '../utils';
import { useToastStore } from './toastStore';
import { useAuthStore } from './authStore';
import { useWatchlistStore } from './watchlistStore';

export interface CustomListStoreState {
  customLists: CustomList[];
  activeCustomListId: string | null;
  isListsLoading: boolean;
  curatedLists: CuratedList[];
  isCuratedListsLoading: boolean;
  setActiveCustomListId: (id: string | null) => void;
  fetchCustomLists: () => Promise<void>;
  fetchCuratedLists: () => Promise<void>;
  createCustomList: (name: string, emoji?: string) => Promise<boolean>;
  updateCustomList: (id: string, name: string, emoji?: string) => Promise<boolean>;
  deleteCustomList: (id: string) => Promise<boolean>;
  setItemCustomLists: (itemId: string, listIds: string[]) => Promise<void>;
  toggleItemCustomList: (itemId: string, listId: string) => Promise<void>;
  addCuratedList: (id: string) => Promise<boolean>;
  clearCustomListsState: () => void;
}

export const useCustomListStore = create<CustomListStoreState>()(
  persist(
    (set, get) => ({
      customLists: [],
      activeCustomListId: null,
      isListsLoading: false,
      curatedLists: [],
      isCuratedListsLoading: false,

      setActiveCustomListId: (id) => {
        set({ activeCustomListId: id });
      },

      clearCustomListsState: () => {
        set({ customLists: [], activeCustomListId: null });
      },

      fetchCustomLists: async () => {
        const user = useAuthStore.getState().user;
        if (!user) {
          set({ customLists: [] });
          return;
        }
        set({ isListsLoading: true });
        try {
          const res = await customListService.getCustomLists();
          if (res.success && Array.isArray(res.lists)) {
            set({ customLists: res.lists });
          }
        } catch (err) {
          console.warn('[CustomLists] Failed to load custom lists:', err);
        } finally {
          set({ isListsLoading: false });
        }
      },

      fetchCuratedLists: async () => {
        set({ isCuratedListsLoading: true });
        try {
          const res = await customListService.getCuratedLists();
          if (res.success && Array.isArray(res.lists)) {
            set({ curatedLists: res.lists });
          }
        } catch (err) {
          console.warn('[CustomLists] Failed to load curated lists:', err);
        } finally {
          set({ isCuratedListsLoading: false });
        }
      },

      createCustomList: async (name: string, emoji = '🎬'): Promise<boolean> => {
        const showToast = useToastStore.getState().showToast;
        try {
          const res = await customListService.createCustomList(name, emoji);
          if (res.success && res.list) {
            trackEvent('custom_list_created', { listName: res.list.name });
            set((state) => ({ customLists: [...state.customLists, res.list] }));
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
      },

      updateCustomList: async (id: string, name: string, emoji?: string): Promise<boolean> => {
        const showToast = useToastStore.getState().showToast;
        try {
          const res = await customListService.updateCustomList(id, name, emoji);
          if (res.success && res.list) {
            set((state) => ({
              customLists: state.customLists.map((l) => (l.id === id ? { ...l, ...res.list } : l)),
            }));
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
      },

      deleteCustomList: async (id: string): Promise<boolean> => {
        const showToast = useToastStore.getState().showToast;
        try {
          const res = await customListService.deleteCustomList(id);
          if (res.success) {
            set((state) => ({
              customLists: state.customLists.filter((l) => l.id !== id),
              activeCustomListId: state.activeCustomListId === id ? null : state.activeCustomListId,
            }));

            const deletedSet = new Set(res.deletedItemIds || []);
            useWatchlistStore.getState().updateItemsAfterListDeletion(id, deletedSet, res.stats);

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
      },

      setItemCustomLists: async (itemId: string, listIds: string[]) => {
        const showToast = useToastStore.getState().showToast;
        try {
          const res = await customListService.setItemCustomLists(itemId, listIds);
          if (res.success) {
            useWatchlistStore.getState().updateItemLists(itemId, listIds);
            await get().fetchCustomLists();
            showToast('Movie lists updated!', 'success');
          } else {
            showToast(res.error || 'Failed to update movie lists.', 'error');
          }
        } catch {
          showToast('Failed to update movie lists.', 'error');
        }
      },

      toggleItemCustomList: async (itemId: string, listId: string) => {
        const item = useWatchlistStore.getState().items.find((i) => i.id === itemId);
        if (!item) return;
        const currentLists = item.customLists || [];
        const exists = currentLists.includes(listId);
        const updatedLists = exists
          ? currentLists.filter((id) => id !== listId)
          : [...currentLists, listId];

        await get().setItemCustomLists(itemId, updatedLists);
      },

      addCuratedList: async (id: string): Promise<boolean> => {
        const showToast = useToastStore.getState().showToast;
        const user = useAuthStore.getState().user;
        if (!user) {
          showToast('Please sign in with Stremio to add standard lists.', 'error');
          return false;
        }
        try {
          const res = await customListService.addCuratedList(id);
          if (res.success && res.list) {
            const addedList = res.list;
            trackEvent('curated_list_added', {
              listName: addedList.name || id,
              addedMoviesCount: res.addedMoviesCount ?? 0,
            });
            showToast(
              `Added "${addedList.name || 'Standard List'}" (${res.addedMoviesCount ?? 0} new movies)!`,
              'success'
            );

            set((state) => {
              if (
                state.customLists.some(
                  (cl) =>
                    cl.id === addedList.id ||
                    cl.name.trim().toLowerCase() === addedList.name.trim().toLowerCase()
                )
              ) {
                return state;
              }
              return { customLists: [...state.customLists, addedList] };
            });

            set((state) => ({
              curatedLists: state.curatedLists.map((cl) =>
                cl.id === id ? { ...cl, isAdded: true } : cl
              ),
            }));

            Promise.all([
              useWatchlistStore.getState().refreshWatchlist(),
              get().fetchCustomLists(),
              get().fetchCuratedLists(),
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
      },
    }),
    {
      name: 'stremio_custom_lists_preferences',
      partialize: (state) => ({ activeCustomListId: state.activeCustomListId }),
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
