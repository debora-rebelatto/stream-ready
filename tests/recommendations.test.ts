import { buildRecommendedList, CURATED_RECOMMENDED_MOVIES } from '../src/lib/recommendations';
import { enrichWatchlistItem } from '../lib/db/qualityEvaluator';
import type { WatchlistItem } from '../src/types';

describe('recommendations library', () => {
  test('returns 6 curated movies when watchlist is empty', () => {
    const list = buildRecommendedList([]);
    expect(list).toHaveLength(6);

    const readyCount = list.filter((m) => m.isReady).length;
    const unreleasedCount = list.filter((m) => !m.isReady).length;

    expect(readyCount).toBe(3);
    expect(unreleasedCount).toBe(3);

    // Each movie should have necessary fields
    for (const movie of list) {
      expect(movie.id).toMatch(/^tt\d+/);
      expect(movie.name).toBeTruthy();
      expect(movie.description).toBeTruthy();
      expect(movie.banner).toBeTruthy();
      expect(movie.qualityBadge).toBeTruthy();
      expect(movie.isInWatchlist).toBe(false);
    }
  });

  test('keeps curated Letterboxd 2026 movies even when user has existing items in watchlist', () => {
    const userItems: WatchlistItem[] = [
      {
        id: 'tt0111161',
        name: 'The Shawshank Redemption',
        year: 1994,
        has1080pPlus: true,
        bestQuality: '1080p BluRay',
        streamCount: 15,
        type: 'movie',
        isWatched: false,
      },
      {
        id: 'tt9999999',
        name: 'Unrelated Sci-Fi Movie 2027',
        year: 2027,
        has1080pPlus: false,
        bestQuality: 'Unreleased',
        streamCount: 0,
        type: 'movie',
        isWatched: false,
      },
    ];

    const list = buildRecommendedList(userItems, '1080p', 6);
    expect(list).toHaveLength(6);

    // It should still feature the 6 curated Letterboxd 2026 titles
    expect(list[0].id).toBe('tt34384661'); // Godzilla Minus Zero
    expect(list[1].id).toBe('tt15799564'); // Wild Horse Nine
    expect(list[2].id).toBe('tt34206385'); // Primetime
    expect(list[3].id).toBe('tt2056785'); // Wildwood
    expect(list[4].id).toBe('tt45368240'); // You Can See Everything
    expect(list[5].id).toBe('tt35538033'); // Resident Evil

    // None of these are in the user watchlist yet
    expect(list.every((m) => m.isInWatchlist === false)).toBe(true);
  });

  test('detects when a curated Letterboxd movie is already in user watchlist and marks isInWatchlist', () => {
    const userItems: WatchlistItem[] = [
      enrichWatchlistItem(
        {
          id: 'tt34384661', // Godzilla Minus Zero
          name: 'Godzilla Minus Zero',
          has1080pPlus: true,
          bestQuality: '1080p FHD',
          streamCount: 20,
          type: 'movie',
          isWatched: false,
        },
        '1080p'
      ),
      enrichWatchlistItem(
        {
          id: 'tt45368240', // You Can See Everything
          name: 'You Can See Everything',
          has1080pPlus: false,
          bestQuality: 'CAM / TS',
          streamCount: 1,
          type: 'movie',
          isWatched: false,
        },
        '1080p'
      ),
    ];

    const list = buildRecommendedList(userItems, '1080p', 6);
    const godzilla = list.find((m) => m.id === 'tt34384661');
    expect(godzilla).toBeDefined();
    expect(godzilla?.isInWatchlist).toBe(true);
    expect(godzilla?.isReady).toBe(true);

    const theranos = list.find((m) => m.id === 'tt45368240');
    expect(theranos).toBeDefined();
    expect(theranos?.isInWatchlist).toBe(true);
    expect(theranos?.isReady).toBe(false);

    const primetime = list.find((m) => m.id === 'tt34206385');
    expect(primetime).toBeDefined();
    expect(primetime?.isInWatchlist).toBe(false);
  });

  test('respects maxTotal parameter', () => {
    const list = buildRecommendedList([], '1080p', 4);
    expect(list).toHaveLength(4);
  });

  test('rebalances an all-ready sourceList by mixing in curated unreleased movies', () => {
    const allReadySource = Array.from({ length: 9 }, (_, i) => ({
      id: `tt900000${i}`,
      name: `Released Movie ${i + 1}`,
      year: '2026',
      category: 'ready' as const,
      qualityBadge: '4K UHD',
      isReady: true,
      banner: `https://images.metahub.space/background/medium/tt900000${i}/img.jpg`,
    }));

    const list = buildRecommendedList([], '1080p', 9, allReadySource);
    expect(list).toHaveLength(9);

    const readyCount = list.filter((m) => m.isReady).length;
    const unreleasedCount = list.filter((m) => !m.isReady).length;

    expect(readyCount).toBe(6);
    expect(unreleasedCount).toBe(3);
  });
});
