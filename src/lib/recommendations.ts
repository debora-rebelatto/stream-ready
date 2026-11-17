import type { WatchlistItem } from '../types';
import { isItemReady, formatQualityLabel } from './utils';

export interface RecommendedMovie {
  id: string;
  name: string;
  year?: string | number;
  poster?: string;
  banner?: string;
  genres?: string[];
  description?: string;
  imdbRating?: string | number;
  qualityBadge: string;
  isReady: boolean;
  isInWatchlist?: boolean;
}

/**
 * Top 6 Popular Movies of 2026 on Letterboxd
 */
export const CURATED_RECOMMENDED_MOVIES: RecommendedMovie[] = [
  {
    id: 'tt34384661',
    name: 'Godzilla Minus Zero',
    year: '2026',
    poster: 'https://images.metahub.space/poster/medium/tt34384661/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt34384661/img.jpg',
    genres: ['Action', 'Adventure', 'Drama'],
    imdbRating: '8.4',
    qualityBadge: '1080p FHD',
    isReady: true,
    description: "Direct continuation of Takashi Yamazaki's Godzilla saga, following postwar Japan as a cataclysmic atomic menace reemerges from the ocean depths.",
  },
  {
    id: 'tt15799564',
    name: 'Wild Horse Nine',
    year: '2026',
    poster: 'https://images.metahub.space/poster/medium/tt15799564/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt15799564/img.jpg',
    genres: ['Comedy', 'Crime', 'Drama'],
    imdbRating: 'Upcoming',
    qualityBadge: 'Coming Soon • CAM Only',
    isReady: false,
    description: 'CIA agents Chris and Lee face a trust-testing mission from Santiago to Easter Island during 1973 in Chile.',
  },
  {
    id: 'tt34206385',
    name: 'Primetime',
    year: '2026',
    poster: 'https://images.metahub.space/poster/medium/tt34206385/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt34206385/img.jpg',
    genres: ['Biography', 'Crime', 'Drama'],
    imdbRating: '7.0',
    qualityBadge: '4K UHD • WEB-DL',
    isReady: true,
    description: 'In 2006, To Catch a Predator host Chris Hansen sets out to make television history in an escalating, high-stakes media investigation.',
  },
  {
    id: 'tt2056785',
    name: 'Wildwood',
    year: '2026',
    poster: 'https://images.metahub.space/poster/medium/tt2056785/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt2056785/img.jpg',
    genres: ['Animation', 'Adventure', 'Fantasy'],
    imdbRating: '8.7',
    qualityBadge: 'Coming Soon • CAM Only',
    isReady: false,
    description: 'The adventures of Prue McKeel as she sets off to the magical forests outside Portland to find her kidnapped brother in Laika’s stop-motion epic.',
  },
  {
    id: 'tt45368240',
    name: 'You Can See Everything',
    year: '2026',
    poster: 'https://images.metahub.space/poster/medium/tt45368240/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt45368240/img.jpg',
    genres: ['Documentary', 'Biography'],
    imdbRating: '9.0',
    qualityBadge: 'Coming Soon • Theater Rip',
    isReady: false,
    description: 'Thirty-four days before she is sent to prison, notorious Theranos founder Elizabeth Holmes invites a skeptical film crew to document her every move in an intimate portrait.',
  },
  {
    id: 'tt35538033',
    name: 'Resident Evil',
    year: '2026',
    poster: 'https://images.metahub.space/poster/medium/tt35538033/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt35538033/img.jpg',
    genres: ['Action', 'Horror', 'Sci-Fi'],
    imdbRating: '7.2',
    qualityBadge: '4K UHD • WEB-DL',
    isReady: true,
    description: 'Follows a courier tasked with delivering a package to a remote hospital who finds himself caught in the middle of a catastrophic biological outbreak.',
  },
];

/**
 * Builds the recommended movies list (Top 6 Popular on Letterboxd 2026).
 * Annotates each movie with isInWatchlist: true/false according to the user's watchlist,
 * and reflects real-time tracker quality if already present in the user's watchlist.
 */
export function buildRecommendedList(
  watchlistItems: WatchlistItem[] = [],
  globalMinQuality: '1080p' | '4k' = '1080p',
  maxTotal: number = 6
): RecommendedMovie[] {
  return CURATED_RECOMMENDED_MOVIES.slice(0, maxTotal).map((curated) => {
    const userItem = (watchlistItems || []).find((w) => w.id === curated.id);
    if (!userItem) {
      return {
        ...curated,
        isInWatchlist: false,
      };
    }

    const ready = isItemReady(userItem, globalMinQuality);
    const qualityLabel = formatQualityLabel(userItem.bestQuality);

    return {
      ...curated,
      isReady: ready,
      qualityBadge: qualityLabel || curated.qualityBadge,
      isInWatchlist: true,
    };
  });
}
