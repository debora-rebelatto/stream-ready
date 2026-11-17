jest.mock('../../server/services/qualityCheckerService', () => ({
  __esModule: true,
  checkMovieQuality: jest.fn().mockResolvedValue({
    has1080pPlus: true,
    isReady: true,
    isCamOnly: false,
    bestQuality: '4K UHD',
    streamCount: 100,
  }),
  qualityCheckerService: {
    checkMovieQuality: jest.fn(),
  },
}));

const { getTrendingMovies, clearTrendingCache } = require('../../server/services/tmdbService');
const qualityChecker = require('../../server/services/qualityCheckerService');

describe('TMDB & Trending Movies Service', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.TMDB_API_KEY;

  beforeEach(() => {
    clearTrendingCache();
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.TMDB_API_KEY = originalApiKey;
    clearTrendingCache();
  });

  it('fetches trending movies from TMDB and enriches quality when TMDB_API_KEY is configured', async () => {
    process.env.TMDB_API_KEY = 'test_tmdb_key_123';

    (qualityChecker.checkMovieQuality as jest.Mock).mockResolvedValue({
      has1080pPlus: true,
      isReady: true,
      isCamOnly: false,
      bestQuality: '4K UHD',
      streamCount: 100,
    });

    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url.includes('/discover/movie')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                id: 101,
                title: 'Dune: Part Two',
                release_date: '2024-03-01',
                poster_path: '/poster1.jpg',
                backdrop_path: '/backdrop1.jpg',
                genre_ids: [878, 12],
                overview: 'Paul Atreides unites with Chani and the Fremen.',
                vote_average: 8.3,
              },
            ],
          }),
        };
      }
      if (url.includes('/movie/101/external_ids')) {
        return {
          ok: true,
          json: async () => ({
            imdb_id: 'tt15239678',
          }),
        };
      }
      return { ok: false };
    });

    const movies = await getTrendingMovies(1);

    expect(movies).toHaveLength(1);
    expect(movies[0].id).toBe('tt15239678');
    expect(movies[0].name).toBe('Dune: Part Two');
    expect(movies[0].year).toBe('2024');
    expect(movies[0].banner).toBe('https://image.tmdb.org/t/p/original/backdrop1.jpg');
    expect(movies[0].poster).toBe('https://image.tmdb.org/t/p/w500/poster1.jpg');
    expect(movies[0].genres).toContain('Sci-Fi');
    expect(movies[0].genres).toContain('Adventure');
    expect(movies[0].imdbRating).toBe('8.3');
    expect(movies[0].isReady).toBe(true);
    expect(movies[0].qualityBadge).toBe('4K UHD');

    // Cached check: subsequent call should use memory cache and not fetch again
    const cached = await getTrendingMovies(1);
    expect(cached).toEqual(movies);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('falls back to Cinemeta top movies when TMDB_API_KEY is not configured', async () => {
    delete process.env.TMDB_API_KEY;
    delete process.env.VITE_TMDB_API_KEY;

    (qualityChecker.checkMovieQuality as jest.Mock).mockResolvedValueOnce({
      has1080pPlus: false,
      isReady: false,
      isCamOnly: true,
      bestQuality: 'CAM / Theater Rip',
      streamCount: 5,
    });

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        metas: [
          {
            id: 'tt1234567',
            name: 'Cinemeta Popular Movie',
            releaseInfo: '2026',
            poster: 'https://images.metahub.space/poster/medium/tt1234567/img',
            background: 'https://images.metahub.space/background/medium/tt1234567/img',
            genres: ['Action'],
            description: 'A great movie',
            imdbRating: '7.8',
          },
        ],
      }),
    });

    const movies = await getTrendingMovies(1);

    expect(movies).toHaveLength(1);
    expect(movies[0].id).toBe('tt1234567');
    expect(movies[0].name).toBe('Cinemeta Popular Movie');
    expect(movies[0].isReady).toBe(false);
    expect(movies[0].qualityBadge).toBe('CAM Only • In Theaters');
  });

  it('returns empty array when network fails gracefully without throwing', async () => {
    process.env.TMDB_API_KEY = 'test_tmdb_key_123';
    global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

    const movies = await getTrendingMovies(5);
    expect(Array.isArray(movies)).toBe(true);
    expect(movies).toHaveLength(0);
  });
});
