import React, { useState, useCallback } from 'react';
import type { CustomList, CuratedList, WatchlistItem, StremioUser } from '../models';
import { customListService } from '../services';
import { trackEvent } from '../utils';

export interface UseCustomListsControllerOptions {
  user: StremioUser | null;
  items: WatchlistItem[];
  setItems: React.Dispatch<React.SetStateAction<WatchlistItem[]>>;
  refreshWatchlist: () => Promise<void>;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export function useCustomListsController({
  user,
  items,
  setItems,
  refreshWatchlist,
  showToast,
}: UseCustomListsControllerOptions) {
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeCustomListId, setActiveCustomListId] = useState<string | null>(null);
  const [isListsLoading, setIsListsLoading] = useState(false);
  const [curatedLists, setCuratedLists] = useState<CuratedList[]>([]);
  const [isCuratedListsLoading, setIsCuratedListsLoading] = useState(false);

  const clearCustomListsState = useCallback(() => {
    setCustomLists([]);
    setActiveCustomListId(null);
  }, []);

  const fetchCustomLists = useCallback(async () => {
    if (!user) {
      setCustomLists([]);
      return;
    }
    setIsListsLoading(true);
    try {
      const res = await customListService.getCustomLists();
      if (res.success && Array.isArray(res.lists)) {
        setCustomLists(res.lists);
      }
    } catch (err) {
      console.warn('[CustomLists] Failed to load custom lists:', err);
    } finally {
      setIsListsLoading(false);
    }
  }, [user]);

  const fetchCuratedLists = useCallback(async () => {
    setIsCuratedListsLoading(true);
    try {
      const res = await customListService.getCuratedLists();
      if (res.success && Array.isArray(res.lists)) {
        setCuratedLists(res.lists);
      }
    } catch (err) {
      console.warn('[CustomLists] Failed to load curated lists:', err);
    } finally {
      setIsCuratedListsLoading(false);
    }
  }, []);

  const createCustomList = async (name: string, emoji = 'film'): Promise<boolean> => {
    try {
      const res = await customListService.createCustomList(name, emoji);
      if (res.success && res.list) {
        trackEvent('custom_list_created', { listName: res.list.name });
        setCustomLists((prev) => [...prev, res.list]);
        showToast(`List "${res.list.name}" created successfully!`, 'success');
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
      const res = await customListService.updateCustomList(id, name, emoji);
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
      const res = await customListService.deleteCustomList(id);
      if (res.success) {
        setCustomLists((prev) => prev.filter((l) => l.id !== id));
        if (activeCustomListId === id) {
          setActiveCustomListId(null);
        }
        const deletedSet = new Set(res.deletedItemIds || []);
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
      const res = await customListService.setItemCustomLists(itemId, listIds);
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
      const res = await customListService.addCuratedList(id);
      if (res.success && res.list) {
        const addedList = res.list;
        const addedCount = res.addedMoviesCount ?? 0;
        trackEvent('curated_list_added', {
          listName: addedList.name || id,
          addedMoviesCount: addedCount,
        });
        if (addedCount > 0) {
          showToast(
            `Added "${addedList.name || 'Standard List'}" (${addedCount} new movies)!`,
            'success'
          );
        } else {
          showToast(
            `"${addedList.name || 'Standard List'}" is already in your account (all movies are up to date).`,
            'info'
          );
        }

        setCustomLists((prev) => {
          if (
            prev.some(
              (cl) =>
                cl.id === addedList.id ||
                cl.name.trim().toLowerCase() === addedList.name.trim().toLowerCase()
            )
          ) {
            return prev;
          }
          return [...prev, addedList];
        });

        setCuratedLists((prev) => prev.map((cl) => (cl.id === id ? { ...cl, isAdded: true } : cl)));

        Promise.all([refreshWatchlist(), fetchCustomLists(), fetchCuratedLists()]).catch(() => {});

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

  return {
    customLists,
    activeCustomListId,
    setActiveCustomListId,
    isListsLoading,
    curatedLists,
    isCuratedListsLoading,
    fetchCustomLists,
    fetchCuratedLists,
    createCustomList,
    updateCustomList,
    deleteCustomList,
    setItemCustomLists,
    toggleItemCustomList,
    addCuratedList,
    clearCustomListsState,
  };
}
