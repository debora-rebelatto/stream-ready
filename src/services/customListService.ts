import { api } from '../utils';
import type { CustomList, CuratedList, WatchlistItem } from '../models';

export const customListService = {
  /**
   * Retrieves all custom user lists
   */
  async getCustomLists(): Promise<{ success: boolean; lists: CustomList[] }> {
    return api.getCustomLists();
  },

  /**
   * Creates a new custom list with an optional emoji
   */
  async createCustomList(
    name: string,
    emoji = ''
  ): Promise<{ success: boolean; list: CustomList; error?: string }> {
    return api.createCustomList(name, emoji);
  },

  /**
   * Updates an existing custom list name and emoji
   */
  async updateCustomList(
    id: string,
    name: string,
    emoji?: string
  ): Promise<{ success: boolean; list: CustomList; error?: string }> {
    return api.updateCustomList(id, name, emoji);
  },

  /**
   * Deletes a custom list and dissociates items
   */
  async deleteCustomList(id: string): Promise<{
    success: boolean;
    deletedItemsCount?: number;
    deletedItemIds?: string[];
    error?: string;
  }> {
    return api.deleteCustomList(id);
  },

  /**
   * Assigns an item to multiple custom list IDs
   */
  async setItemCustomLists(
    id: string,
    listIds: string[]
  ): Promise<{ success: boolean; item: WatchlistItem; error?: string }> {
    return api.setItemCustomLists(id, listIds);
  },

  /**
   * Fetches curated streaming platform lists (Netflix, Disney+, etc.)
   */
  async getCuratedLists(): Promise<{ success: boolean; lists: CuratedList[]; error?: string }> {
    return api.getCuratedLists();
  },

  /**
   * Adds an entire curated list to the user's account
   */
  async addCuratedList(id: string): Promise<{
    success: boolean;
    list?: CustomList;
    addedMoviesCount?: number;
    existingMoviesCount?: number;
    error?: string;
  }> {
    return api.addCuratedList(id);
  },
};
