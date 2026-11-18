export interface CinemetaItem {
  id: string;
  type: string;
  name: string;
  year: string;
  poster: string;
  banner: string;
  genres: string[];
  description: string;
  imdbRating: string;
}

export interface CinemetaDetail extends CinemetaItem {
  runtime?: string;
  director?: string[];
  cast?: string[];
}

export interface StreamBehaviorHints {
  bingeGroup?: string;
  filename?: string;
  [key: string]: any;
}

export interface StreamItem {
  name?: string;
  title?: string;
  behaviorHints?: StreamBehaviorHints;
  [key: string]: any;
}

export interface ParsedStreams {
  has1080pPlus: boolean;
  isReady: boolean;
  isCamOnly: boolean;
  isUnreleased?: boolean;
  bestQuality: string;
  streamCount: number;
  cleanStreamCount: number;
  count1080pPlus: number;
  checkedAt: string;
  error?: string;
}

export interface QualityCheckResult extends ParsedStreams {}

export interface StremioUser {
  id: string;
  email: string;
}

export interface StremioLoginResult {
  success: boolean;
  authKey?: string;
  user?: StremioUser;
  error?: string;
}

export interface StremioWatchedMovie {
  id: string;
  name: string;
  year: string;
  poster: string;
  type: string;
  isWatched: boolean;
  watchedAt: string;
  addedAt: string;
  has1080pPlus: boolean;
  bestQuality: string;
  streamCount: number;
}

export interface UserDataDecodedItem {
  id: string;
  name: string;
  poster: string;
  year: string;
  bestQuality: string;
  has1080pPlus: boolean;
  streamCount: number;
  type: string;
}

export interface UserDataDecoded {
  authKey: string;
  items: UserDataDecodedItem[];
  ids: string[];
}

export interface AddonCatalogDef {
  type: string;
  id: string;
  name: string;
  extra?: Array<{ name: string; isRequired?: boolean }>;
}

export interface AddonManifest {
  id: string;
  version: string;
  name: string;
  description: string;
  logo?: string;
  background?: string;
  resources: string[];
  types: string[];
  catalogs: AddonCatalogDef[];
  idPrefixes: string[];
  behaviorHints: {
    configurable: boolean;
    configurationRequired: boolean;
  };
}

export interface CatalogMetaItem {
  id: string;
  type: string;
  name: string;
  poster: string;
  posterShape: string;
  banner: string;
  genres: string[];
  releaseInfo?: string;
  description: string;
}

export interface CatalogResponse {
  metas: CatalogMetaItem[];
}

export interface MetaResponse {
  meta: any;
}

export interface CuratedListItem {
  id: string;
  type?: string;
  name: string;
  year?: string;
  poster?: string;
  banner?: string;
  genres?: string[];
  description?: string;
  imdbRating?: string | number;
}

export interface CuratedList {
  id: string;
  name: string;
  title?: string;
  description: string;
  badge?: string;
  emoji?: string;
  platform?: string;
  color?: string;
  gradient?: string;
  items: CuratedListItem[];
}

