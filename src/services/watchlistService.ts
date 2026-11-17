import { api } from '../lib/api';
import { cinemetaService } from './cinemetaService';
import type { WatchlistItem, WatchlistStats, SearchMovieResult } from '../types';

export const watchlistService = {
  /**
   * Search movies using client-side Cinemeta service with fallback to server API
   */
  async searchMovies(query: string): Promise<SearchMovieResult[]> {
    try {
      const results = await cinemetaService.searchMovies(query);
      if (results && results.length > 0) {
        return results;
      }
    } catch {
      // ignore
    }
    return api.searchMovies(query);
  },

  /**
   * Load user watchlist and calculate stats on the fly
   */
  async getWatchlist(filter?: 'ready' | 'pending'): Promise<{
    items: WatchlistItem[];
    stats: WatchlistStats;
    requireAuth: boolean;
  }> {
    return api.getItems(filter);
  },

  /**
   * Add a movie to user watchlist
   */
  async addItem(id: string, type: string = 'movie') {
    return api.addItem(id, type);
  },

  /**
   * Remove a movie from watchlist
   */
  async removeItem(id: string) {
    return api.deleteItem(id);
  },

  /**
   * Mark movie as watched or restore to unwatched
   */
  async setWatched(id: string, watched: boolean) {
    return api.setWatched(id, watched);
  },

  /**
   * Update minimum desired quality for a single movie
   */
  async setItemMinQuality(id: string, minQuality: '1080p' | '4k' | null) {
    return api.setItemMinQuality(id, minQuality);
  },

  /**
   * Sync playback & watch history directly from official Stremio account
   */
  async syncWatchedFromStremio() {
    return api.syncWatchedFromStremio();
  },

  /**
   * Recheck quality for a single item
   */
  async recheckItem(id: string) {
    return api.recheckSingle(id);
  },

  /**
   * Recheck all pending movies
   */
  async recheckAll(forceAll = false) {
    return api.recheckAll(forceAll);
  },

  /**
   * Export JSON backup
   */
  async exportBackup(): Promise<WatchlistItem[]> {
    return api.exportBackup();
  },

  /**
   * Import JSON backup
   */
  async importBackup(items: WatchlistItem[]) {
    return api.importBackup(items);
  },

  /**
   * Custom user lists
   */
  async getCustomLists() {
    return api.getCustomLists();
  },

  async createCustomList(name: string, emoji = '🎬') {
    return api.createCustomList(name, emoji);
  },

  async updateCustomList(id: string, name: string, emoji?: string) {
    return api.updateCustomList(id, name, emoji);
  },

  async deleteCustomList(id: string) {
    return api.deleteCustomList(id);
  },

  async setItemCustomLists(id: string, listIds: string[]) {
    return api.setItemCustomLists(id, listIds);
  },
};
