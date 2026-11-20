import { create } from 'zustand';
import type { AppSettings } from '../models';
import { systemService } from '../services';
import { trackEvent } from '../utils';
import { useToastStore } from './toastStore';
import { useWatchlistStore } from './watchlistStore';

export interface SettingsStoreState {
  globalMinQuality: '1080p' | '4k';
  autoSyncWatched: boolean;
  trackWatchlistWatched: boolean;
  syncPreviouslyWatched: boolean;
  setGlobalMinQuality: (quality: '1080p' | '4k') => Promise<void>;
  setAutoSyncWatched: (enabled: boolean) => Promise<void>;
  setTrackWatchlistWatched: (enabled: boolean) => Promise<void>;
  setSyncPreviouslyWatched: (enabled: boolean) => Promise<void>;
  applyLoadedSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  globalMinQuality: '1080p',
  autoSyncWatched: false,
  trackWatchlistWatched: true,
  syncPreviouslyWatched: false,

  applyLoadedSettings: (settings: AppSettings) => {
    if (settings?.minQuality === '4k' || settings?.minQuality === '1080p') {
      set({ globalMinQuality: settings.minQuality });
    }
    if (typeof settings?.autoSyncWatched === 'boolean') {
      set({ autoSyncWatched: settings.autoSyncWatched });
    }
    if (typeof settings?.trackWatchlistWatched === 'boolean') {
      set({ trackWatchlistWatched: settings.trackWatchlistWatched });
    }
    if (typeof settings?.syncPreviouslyWatched === 'boolean') {
      set({ syncPreviouslyWatched: settings.syncPreviouslyWatched });
    }
  },

  setGlobalMinQuality: async (quality: '1080p' | '4k') => {
    const showToast = useToastStore.getState().showToast;
    const prevQuality = useSettingsStore.getState().globalMinQuality;
    set({ globalMinQuality: quality });

    // Update watchlist items quality calculation
    useWatchlistStore.getState().recomputeItemsEnrichment(quality);

    try {
      await systemService.saveSettings({ minQuality: quality });
      trackEvent('quality_setting_updated', { minQuality: quality, scope: 'global' });
      showToast(
        `Default quality updated to ${quality === '4k' ? '4K UHD' : '1080p FHD'}.`,
        'success'
      );
    } catch {
      set({ globalMinQuality: prevQuality });
      useWatchlistStore.getState().recomputeItemsEnrichment(prevQuality);
      showToast('Failed to save quality setting to cloud.', 'error');
    }
  },

  setAutoSyncWatched: async (enabled: boolean) => {
    const showToast = useToastStore.getState().showToast;
    set({ autoSyncWatched: enabled });
    try {
      await systemService.saveSettings({ autoSyncWatched: enabled });
      trackEvent('sync_setting_updated', { setting: 'autoSyncWatched', enabled });
      showToast(
        enabled
          ? 'Auto-sync enabled: Stremio watched movies will automatically sync to your watchlist.'
          : 'Auto-sync disabled.',
        'success'
      );
    } catch {
      set({ autoSyncWatched: !enabled });
      showToast('Failed to save auto-sync setting.', 'error');
    }
  },

  setTrackWatchlistWatched: async (enabled: boolean) => {
    const showToast = useToastStore.getState().showToast;
    set({ trackWatchlistWatched: enabled });
    try {
      await systemService.saveSettings({ trackWatchlistWatched: enabled });
      trackEvent('sync_setting_updated', { setting: 'trackWatchlistWatched', enabled });
      showToast(
        enabled
          ? 'Watchlist tracking enabled: Movies will be tracked for watched status.'
          : 'Watchlist tracking disabled.',
        'success'
      );
    } catch {
      set({ trackWatchlistWatched: !enabled });
      showToast('Failed to save tracking setting.', 'error');
    }
  },

  setSyncPreviouslyWatched: async (enabled: boolean) => {
    const showToast = useToastStore.getState().showToast;
    set({ syncPreviouslyWatched: enabled });
    try {
      await systemService.saveSettings({ syncPreviouslyWatched: enabled });
      trackEvent('sync_setting_updated', { setting: 'syncPreviouslyWatched', enabled });
      showToast(
        enabled
          ? 'Historical sync enabled: Past watched movies from Stremio will be synced.'
          : 'Historical sync disabled.',
        'success'
      );
    } catch {
      set({ syncPreviouslyWatched: !enabled });
      showToast('Failed to save historical sync setting.', 'error');
    }
  },
}));
