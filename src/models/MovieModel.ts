export interface WatchlistItem {
  id: string;
  userId?: string;
  rowId?: string | number;
  type: string;
  name: string;
  year?: string | number;
  poster?: string;
  banner?: string;
  genres?: string[];
  description?: string;
  imdbRating?: string | number;
  addedAt?: string | null;
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

export interface WatchlistStats {
  total: number;
  ready: number;
  pending: number;
  unreleased: number;
  watched: number;
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
