import type { WatchlistItem } from '../models';
import { getMovieComputedStatus } from './qualityAdapter';

export interface RecommendedMovie {
  id: string;
  name: string;
  year?: string | number;
  releaseDate?: string;
  category?: 'ready' | 'in_theaters' | 'upcoming';
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
    category: 'ready',
    poster: 'https://images.metahub.space/poster/medium/tt34384661/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt34384661/img.jpg',
    genres: ['Action', 'Adventure', 'Drama'],
    imdbRating: '8.4',
    qualityBadge: '1080p FHD',
    isReady: true,
    description:
      "Direct continuation of Takashi Yamazaki's Godzilla saga, following postwar Japan as a cataclysmic atomic menace reemerges from the ocean depths.",
  },
  {
    id: 'tt15799564',
    name: 'Wild Horse Nine',
    year: '2026',
    category: 'upcoming',
    poster: 'https://images.metahub.space/poster/medium/tt15799564/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt15799564/img.jpg',
    genres: ['Comedy', 'Crime', 'Drama'],
    imdbRating: 'Upcoming',
    qualityBadge: 'Coming Soon • Unreleased',
    isReady: false,
    description:
      'CIA agents Chris and Lee face a trust-testing mission from Santiago to Easter Island during 1973 in Chile.',
  },
  {
    id: 'tt34206385',
    name: 'Primetime',
    year: '2026',
    category: 'ready',
    poster: 'https://images.metahub.space/poster/medium/tt34206385/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt34206385/img.jpg',
    genres: ['Biography', 'Crime', 'Drama'],
    imdbRating: '7.0',
    qualityBadge: '4K UHD • WEB-DL',
    isReady: true,
    description:
      'In 2006, To Catch a Predator host Chris Hansen sets out to make television history in an escalating, high-stakes media investigation.',
  },
  {
    id: 'tt2056785',
    name: 'Wildwood',
    year: '2026',
    category: 'upcoming',
    poster: 'https://images.metahub.space/poster/medium/tt2056785/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt2056785/img.jpg',
    genres: ['Animation', 'Adventure', 'Fantasy'],
    imdbRating: '8.7',
    qualityBadge: 'Coming Soon • Unreleased',
    isReady: false,
    description:
      'The adventures of Prue McKeel as she sets off to the magical forests outside Portland to find her kidnapped brother in Laika’s stop-motion epic.',
  },
  {
    id: 'tt45368240',
    name: 'You Can See Everything',
    year: '2026',
    category: 'in_theaters',
    poster: 'https://images.metahub.space/poster/medium/tt45368240/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt45368240/img.jpg',
    genres: ['Documentary', 'Biography'],
    imdbRating: '9.0',
    qualityBadge: 'Coming Soon • Theater Rip',
    isReady: false,
    description:
      'Thirty-four days before she is sent to prison, notorious Theranos founder Elizabeth Holmes invites a skeptical film crew to document her every move in an intimate portrait.',
  },
  {
    id: 'tt35538033',
    name: 'Resident Evil',
    year: '2026',
    category: 'ready',
    poster: 'https://images.metahub.space/poster/medium/tt35538033/img.jpg',
    banner: 'https://images.metahub.space/background/medium/tt35538033/img.jpg',
    genres: ['Action', 'Horror', 'Sci-Fi'],
    imdbRating: '7.2',
    qualityBadge: '4K UHD • WEB-DL',
    isReady: true,
    description:
      'Follows a courier tasked with delivering a package to a remote hospital who finds himself caught in the middle of a catastrophic biological outbreak.',
  },
];

function ensureBalancedSourcePool(
  sourceList: RecommendedMovie[],
  maxTotal: number
): RecommendedMovie[] {
  const sliced = sourceList.slice(0, maxTotal);
  if (maxTotal < 3 || sliced.length < 3) {
    return sliced;
  }

  const hasUnreleased = sliced.some((movie) => !movie.isReady);
  if (hasUnreleased) {
    return sliced;
  }

  // Safeguard: if an upstream trending list returns only already-released movies,
  // interleave curated unreleased titles so the hero always showcases tracking value.
  const targetUnreleased = Math.max(1, Math.floor(maxTotal / 3));
  const existingIds = new Set(sliced.map((m) => m.id));
  const unreleasedBackfill = CURATED_RECOMMENDED_MOVIES.filter(
    (m) => !m.isReady && !existingIds.has(m.id)
  ).slice(0, targetUnreleased);

  if (unreleasedBackfill.length === 0) {
    return sliced;
  }

  const readyCount = Math.max(0, maxTotal - unreleasedBackfill.length);
  const readyKeep = sliced.slice(0, readyCount);
  const balanced: RecommendedMovie[] = [];

  let rIdx = 0;
  let uIdx = 0;
  while (balanced.length < maxTotal && (rIdx < readyKeep.length || uIdx < unreleasedBackfill.length)) {
    if (rIdx < readyKeep.length) balanced.push(readyKeep[rIdx++]);
    if (rIdx < readyKeep.length && balanced.length < maxTotal) balanced.push(readyKeep[rIdx++]);
    if (uIdx < unreleasedBackfill.length && balanced.length < maxTotal) {
      balanced.push(unreleasedBackfill[uIdx++]);
    }
  }

  return balanced.slice(0, maxTotal);
}

export function buildRecommendedList(
  watchlistItems: WatchlistItem[] = [],
  _globalMinQuality: '1080p' | '4k' = '1080p',
  maxTotal: number = 6,
  sourceList: RecommendedMovie[] = CURATED_RECOMMENDED_MOVIES
): RecommendedMovie[] {
  const rawPool = sourceList && sourceList.length > 0 ? sourceList : CURATED_RECOMMENDED_MOVIES;
  const pool =
    rawPool === CURATED_RECOMMENDED_MOVIES
      ? rawPool.slice(0, maxTotal)
      : ensureBalancedSourcePool(rawPool, maxTotal);

  return pool.map((curated) => {
    const userItem = (watchlistItems || []).find((w) => w.id === curated.id);
    if (!userItem) {
      return {
        ...curated,
        isInWatchlist: false,
      };
    }

    const computed = getMovieComputedStatus(userItem);
    const hasGoodVideo =
      computed.isReady || computed.qualityTier === '4k' || computed.qualityTier === '1080p';

    return {
      ...curated,
      isReady: hasGoodVideo,
      qualityBadge: computed.qualityLabel || curated.qualityBadge,
      isInWatchlist: true,
    };
  });
}

export async function fetchTrendingMovies(limit = 6): Promise<RecommendedMovie[]> {
  try {
    const res = await fetch(`/api/trending?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.movies || [];
  } catch {
    return [];
  }
}
