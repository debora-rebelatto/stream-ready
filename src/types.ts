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
}

export interface WatchlistStats {
  total: number;
  ready: number;
  pending: number;
  unreleased: number;
}

export interface StremioUser {
  id?: string;
  email: string;
}

export interface AppSettings {
  stremioAuthKey?: string | null;
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
