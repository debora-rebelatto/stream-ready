export type AudioPreference = 'any' | 'surround' | 'atmos';

export interface QualityCriteria {
  minQuality?: '1080p' | '4k';
  minAudio?: AudioPreference;
}

export interface AppSettings extends QualityCriteria {
  stremioAuthKey?: string | null;
  autoSyncWatched?: boolean;
  trackWatchlistWatched?: boolean;
  syncPreviouslyWatched?: boolean;
  onboardingCompleted?: boolean;
}

export interface ServerInfo {
  baseUrl: string;
  manifestUrl: string;
  stremioInstallUrl: string;
  webStremioInstallUrl: string;
  supabaseConfigured: boolean;
  port: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}
