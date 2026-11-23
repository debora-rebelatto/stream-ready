import { create } from 'zustand';
import type { AppSettings, AudioPreference } from '../models';
import { systemService } from '../services';
import { trackEvent } from '../utils';
import { useToastStore } from './toastStore';
import { useWatchlistStore } from './watchlistStore';

export interface SettingsStoreState {
  globalMinQuality: '1080p' | '4k';
  globalMinAudio: AudioPreference;
  autoSyncWatched: boolean;
  trackWatchlistWatched: boolean;
  syncPreviouslyWatched: boolean;
  setGlobalMinQuality: (quality: '1080p' | '4k') => Promise<void>;
  setGlobalMinAudio: (audio: AudioPreference) => Promise<void>;
  setAutoSyncWatched: (enabled: boolean) => Promise<void>;
  setTrackWatchlistWatched: (enabled: boolean) => Promise<void>;
  setSyncPreviouslyWatched: (enabled: boolean) => Promise<void>;
  applyLoadedSettings: (settings: AppSettings) => void;
}

const AUDIO_LABELS: Record<AudioPreference, string> = {
  any: 'Any Audio',
  surround: '5.1+ Surround',
  atmos: 'Dolby Atmos',
};

export const useSettingsStore = create<SettingsStoreState>((set, get) => {
  async function persistSetting<K extends keyof SettingsStoreState>(
    stateKey: K,
    nextValue: SettingsStoreState[K],
    apiPatch: Partial<AppSettings>,
    options: {
      successMessage: string;
      errorMessage: string;
      recomputeWatchlist?: boolean;
      onSuccess?: () => void;
    }
  ) {
    const showToast = useToastStore.getState().showToast;
    const prevValue = get()[stateKey];
    set({ [stateKey]: nextValue } as Partial<SettingsStoreState>);

    if (options.recomputeWatchlist) {
      const { globalMinQuality, globalMinAudio } = get();
      useWatchlistStore.getState().recomputeItemsEnrichment(globalMinQuality, globalMinAudio);
    }

    try {
      await systemService.saveSettings(apiPatch);
      options.onSuccess?.();
      showToast(options.successMessage, 'success');
    } catch {
      set({ [stateKey]: prevValue } as Partial<SettingsStoreState>);
      if (options.recomputeWatchlist) {
        const { globalMinQuality, globalMinAudio } = get();
        useWatchlistStore.getState().recomputeItemsEnrichment(globalMinQuality, globalMinAudio);
      }
      showToast(options.errorMessage, 'error');
    }
  }

  return {
    globalMinQuality: '1080p',
    globalMinAudio: 'any',
    autoSyncWatched: false,
    trackWatchlistWatched: true,
    syncPreviouslyWatched: false,

    applyLoadedSettings: (settings: AppSettings) => {
      const patch: Partial<SettingsStoreState> = {};
      if (settings?.minQuality === '4k' || settings?.minQuality === '1080p') {
        patch.globalMinQuality = settings.minQuality;
      }
      if (
        settings?.minAudio === 'any' ||
        settings?.minAudio === 'surround' ||
        settings?.minAudio === 'atmos'
      ) {
        patch.globalMinAudio = settings.minAudio;
      }
      if (typeof settings?.autoSyncWatched === 'boolean') {
        patch.autoSyncWatched = settings.autoSyncWatched;
      }
      if (typeof settings?.trackWatchlistWatched === 'boolean') {
        patch.trackWatchlistWatched = settings.trackWatchlistWatched;
      }
      if (typeof settings?.syncPreviouslyWatched === 'boolean') {
        patch.syncPreviouslyWatched = settings.syncPreviouslyWatched;
      }
      if (Object.keys(patch).length > 0) {
        set(patch);
      }
    },

    setGlobalMinQuality: (quality) =>
      persistSetting('globalMinQuality', quality, { minQuality: quality }, {
        recomputeWatchlist: true,
        successMessage: `Default quality updated to ${quality === '4k' ? '4K UHD' : '1080p FHD'}.`,
        errorMessage: 'Failed to save quality setting to cloud.',
        onSuccess: () =>
          trackEvent('quality_setting_updated', { minQuality: quality, scope: 'global' }),
      }),

    setGlobalMinAudio: (audio) =>
      persistSetting('globalMinAudio', audio, { minAudio: audio }, {
        recomputeWatchlist: true,
        successMessage: `Audio preference updated to ${AUDIO_LABELS[audio]}.`,
        errorMessage: 'Failed to save audio setting to cloud.',
        onSuccess: () => trackEvent('audio_setting_updated', { minAudio: audio, scope: 'global' }),
      }),

    setAutoSyncWatched: (enabled) =>
      persistSetting('autoSyncWatched', enabled, { autoSyncWatched: enabled }, {
        successMessage: enabled
          ? 'Auto-sync enabled: Stremio watched movies will automatically sync to your watchlist.'
          : 'Auto-sync disabled.',
        errorMessage: 'Failed to save auto-sync setting.',
        onSuccess: () =>
          trackEvent('sync_setting_updated', { setting: 'autoSyncWatched', enabled }),
      }),

    setTrackWatchlistWatched: (enabled) =>
      persistSetting('trackWatchlistWatched', enabled, { trackWatchlistWatched: enabled }, {
        successMessage: enabled
          ? 'Watchlist tracking enabled: Movies will be tracked for watched status.'
          : 'Watchlist tracking disabled.',
        errorMessage: 'Failed to save tracking setting.',
        onSuccess: () =>
          trackEvent('sync_setting_updated', { setting: 'trackWatchlistWatched', enabled }),
      }),

    setSyncPreviouslyWatched: (enabled) =>
      persistSetting('syncPreviouslyWatched', enabled, { syncPreviouslyWatched: enabled }, {
        successMessage: enabled
          ? 'Historical sync enabled: Past watched movies from Stremio will be synced.'
          : 'Historical sync disabled.',
        errorMessage: 'Failed to save historical sync setting.',
        onSuccess: () =>
          trackEvent('sync_setting_updated', { setting: 'syncPreviouslyWatched', enabled }),
      }),
  };
});
