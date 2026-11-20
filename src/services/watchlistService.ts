import { api } from '../utils';
import { cinemetaService } from './cinemetaService';
import { customListService } from './customListService';
import type { WatchlistItem, WatchlistStats, SearchMovieResult, TopMovieMetric } from '../models';

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
    } catch (err) {
      console.warn('[WatchlistService] Cinemeta search failed, falling back to API:', err);
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
   * Fetch top community movies added to watchlists
   */
  async getTopMovies(limit: number = 3): Promise<TopMovieMetric[]> {
    return api.getTopMovies(limit);
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
    return customListService.getCustomLists();
  },

  async createCustomList(name: string, emoji = '') {
    return customListService.createCustomList(name, emoji);
  },

  async updateCustomList(id: string, name: string, emoji?: string) {
    return customListService.updateCustomList(id, name, emoji);
  },

  async deleteCustomList(id: string) {
    return customListService.deleteCustomList(id);
  },

  async setItemCustomLists(id: string, listIds: string[]) {
    return customListService.setItemCustomLists(id, listIds);
  },

  /**
   * Curated / standard lists (New on Netflix, Disney+, HBO Max, etc.)
   */
  async getCuratedLists() {
    return customListService.getCuratedLists();
  },

  async addCuratedList(id: string) {
    return customListService.addCuratedList(id);
  },
};
