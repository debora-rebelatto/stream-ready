export interface AppSettings {
  stremioAuthKey?: string | null;
  minQuality?: '1080p' | '4k';
  autoSyncWatched?: boolean;
  trackWatchlistWatched?: boolean;
  syncPreviouslyWatched?: boolean;
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
