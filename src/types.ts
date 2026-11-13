export interface WatchlistItem {
  id: string;
  userId?: string;
  type: string;
  name: string;
  year?: string | number;
  poster?: string;
  banner?: string;
  genres?: string[];
  description?: string;
  imdbRating?: string | number;
  has1080pPlus: boolean;
  bestQuality?: string;
  streamCount: number;
  count1080pPlus?: number;
  lastChecked?: string | null;
  checkError?: string | null;
  readyAt?: string | null;
  isWatched?: boolean;
  watchedAt?: string | null;
  minQuality?: '1080p' | '4k' | null;
  customLists?: string[];
}

export interface CustomList {
  id: string;
  userId: string;
  name: string;
  emoji?: string;
  createdAt?: string;
  updatedAt?: string;
  itemsCount?: number;
}

export interface WatchlistStats {
  total: number;
  ready: number;
  pending: number;
  unreleased: number;
  watched: number;
}

export interface StremioUser {
  id?: string;
  email: string;
}

export interface AppSettings {
  stremioAuthKey?: string | null;
  minQuality?: '1080p' | '4k';
  autoSyncWatched?: boolean;
}

export interface ServerInfo {
  baseUrl: string;
  manifestUrl: string;
  stremioInstallUrl: string;
  webStremioInstallUrl: string;
  supabaseConfigured: boolean;
  port: number;
}

export interface SearchMovieResult {
  id: string;
  type: string;
  name: string;
  year?: string | number;
  poster?: string;
  banner?: string;
  genres?: string[];
  description?: string;
  imdbRating?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}
