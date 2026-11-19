export type MovieCardStatus = 'watched' | 'new' | 'ready' | 'unreleased' | 'waiting';

export interface MovieReleaseMetadata {
  readyAt?: string | null;
  released?: string | null;
  releaseDate?: string | null;
  has1080pPlus?: boolean;
  year?: string | number;
}

export interface MovieComputedStatus {
  status: MovieCardStatus;
  isWatched: boolean;
  isReady: boolean;
  isNewRelease: boolean;
  isUnreleased: boolean;
  qualityLabel: string;
  streamsLabel: string;
  activeTargetQuality: '1080p' | '4k';
}

export interface WatchlistItem extends MovieReleaseMetadata {
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
  released?: string | null;
  releaseDate?: string | null;
  isWatched?: boolean;
  watchedAt?: string | null;
  minQuality?: '1080p' | '4k' | null;
  customLists?: string[];
  computed?: MovieComputedStatus;
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
