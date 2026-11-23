import type { WatchlistItem } from '../models';
import { getMovieComputedStatus } from './qualityAdapter';

export type WatchlistTab = 'all' | 'ready' | 'unreleased' | 'pending' | 'watched';

export type WatchlistSortOption =
  | 'added_desc'
  | 'added_asc'
  | 'rating_desc'
  | 'rating_asc'
  | 'year_desc'
  | 'year_asc'
  | 'title_asc'
  | 'title_desc'
  | 'streams_desc';

export interface DashboardFilterState {
  searchQuery: string;
  selectedQuality: string;
  selectedAudio: string;
  includeWatchedInAll: boolean;
  sortBy: WatchlistSortOption;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilterState = {
  searchQuery: '',
  selectedQuality: 'all',
  selectedAudio: 'all',
  includeWatchedInAll: true,
  sortBy: 'added_desc',
};

export interface WatchlistFilterCriteria {
  currentTab: WatchlistTab;
  activeCustomListId: string | null;
  selectedQuality: string;
  selectedAudio?: string;
  includeWatchedInAll: boolean;
  searchQuery: string;
}

export function filterWatchlistItems(
  items: WatchlistItem[],
  criteria: WatchlistFilterCriteria
): WatchlistItem[] {
  const {
    currentTab,
    activeCustomListId,
    selectedQuality,
    selectedAudio = 'all',
    includeWatchedInAll,
    searchQuery,
  } = criteria;

  return items.filter((item) => {
    const computed = getMovieComputedStatus(item);

    if (activeCustomListId) {
      if (!Array.isArray(item.customLists) || !item.customLists.includes(activeCustomListId)) {
        return false;
      }
    }

    if (currentTab === 'watched') {
      if (!computed.isWatched) return false;
    } else if (currentTab === 'all') {
      if (!includeWatchedInAll && computed.isWatched) return false;
    } else {
      if (computed.isWatched) return false;

      if (currentTab === 'ready' && !computed.isReady) return false;
      if (currentTab === 'unreleased' && !computed.isUnreleased) return false;
      if (currentTab === 'pending' && (computed.isReady || computed.isUnreleased)) return false;
    }

    if (currentTab !== 'watched' && selectedQuality !== 'all') {
      const tier = computed.qualityTier || 'pending';
      if (tier !== selectedQuality) return false;
    }

    if (currentTab !== 'watched' && selectedAudio && selectedAudio !== 'all') {
      if (selectedAudio === 'atmos') {
        if (!computed.hasAtmos) return false;
      } else if (selectedAudio === 'lossless') {
        if (!computed.isLosslessAudio) return false;
      } else if (selectedAudio === 'surround') {
        if (!computed.hasSurround) return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchYear = String(item.year || '').includes(q);
      if (!matchName && !matchYear) return false;
    }

    return true;
  });
}

function getYearNum(y?: string | number): number {
  if (!y) return 0;
  const match = String(y).match(/\d{4}/);
  return match ? parseInt(match[0], 10) : 0;
}

export function sortWatchlistItems(
  items: WatchlistItem[],
  sortBy: WatchlistSortOption
): WatchlistItem[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'added_asc': {
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return da - db;
      }
      case 'rating_desc': {
        const ra = parseFloat(String(a.imdbRating || '0')) || 0;
        const rb = parseFloat(String(b.imdbRating || '0')) || 0;
        if (ra !== rb) {
          if (ra === 0) return 1;
          if (rb === 0) return -1;
          return rb - ra;
        }
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) return yb - ya;
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return db - da;
        return (a.name || '').localeCompare(b.name || '');
      }
      case 'rating_asc': {
        const ra = parseFloat(String(a.imdbRating || '0')) || 0;
        const rb = parseFloat(String(b.imdbRating || '0')) || 0;
        if (ra !== rb) {
          if (ra === 0) return 1;
          if (rb === 0) return -1;
          return ra - rb;
        }
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) return ya - yb;
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return da - db;
        return (b.name || '').localeCompare(a.name || '');
      }
      case 'year_desc': {
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) {
          if (ya === 0) return 1;
          if (yb === 0) return -1;
          return yb - ya;
        }
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return db - da;
        return (a.name || '').localeCompare(b.name || '');
      }
      case 'year_asc': {
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) {
          if (ya === 0) return 1;
          if (yb === 0) return -1;
          return ya - yb;
        }
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return da - db;
        return (b.name || '').localeCompare(a.name || '');
      }
      case 'title_asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'title_desc':
        return (b.name || '').localeCompare(a.name || '');
      case 'streams_desc':
        return (b.streamCount || 0) - (a.streamCount || 0);
      case 'added_desc':
      default: {
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return db - da;
      }
    }
  });
}
