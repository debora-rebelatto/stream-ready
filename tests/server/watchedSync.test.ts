const {
  syncWatchedWithStremio,
  getSettings,
  updateSettings,
  addItem,
  getItems,
  findUser,
  findUserBucket
} = require('../../lib/db');

// Mock external network calls
jest.mock('../../lib/stremioAuth', () => ({
  getStremioWatchedMovies: jest.fn()
}));

jest.mock('../../lib/cinemeta', () => ({
  getMeta: jest.fn().mockResolvedValue(null)
}));

const { getStremioWatchedMovies } = require('../../lib/stremioAuth');

describe('syncWatchedWithStremio & Watchlist Tracking', () => {
  const testUserId = 'a0000000-0000-0000-0000-000000000001';
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => []
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => []
    });
    const bucket = findUser(testUserId);
    if (bucket) {
      bucket.items = [];
      bucket.settings = {
        minQuality: '1080p',
        trackWatchlistWatched: true,
        syncPreviouslyWatched: false
      };
    }
  });

  test('marks movie watched if watched AFTER being added to watchlist (trackWatchlistWatched = true)', async () => {
    // 1. Add movie to watchlist at T0
    const addedTime = new Date('2026-01-01T10:00:00Z').toISOString();
    await addItem(
      {
        id: 'tt0111161',
        name: 'The Shawshank Redemption',
        isWatched: false,
        addedAt: addedTime
      },
      testUserId
    );

    // 2. Stremio reports movie was watched at T0 + 2 hours
    const watchedTime = new Date('2026-01-01T12:00:00Z').toISOString();
    getStremioWatchedMovies.mockResolvedValueOnce([
      {
        id: 'tt0111161',
        name: 'The Shawshank Redemption',
        watchedAt: watchedTime
      }
    ]);

    const result = await syncWatchedWithStremio('fake_auth_key', testUserId, {
      trackWatchlistWatched: true,
      syncPreviouslyWatched: false
    });

    expect(result.newlyMarked).toBe(1);
    const items = getItems(testUserId);
    const movie = items.find(i => i.id === 'tt0111161');
    expect(movie.isWatched).toBe(true);
    expect(movie.watchedAt).toBe(watchedTime);
  });

  test('does NOT mark movie watched if watched BEFORE being added and syncPreviouslyWatched is false', async () => {
    // 1. Add movie to watchlist at T0
    const addedTime = new Date('2026-01-05T10:00:00Z').toISOString();
    await addItem(
      {
        id: 'tt0068646',
        name: 'The Godfather',
        isWatched: false,
        addedAt: addedTime
      },
      testUserId
    );

    // 2. Stremio reports movie was watched 1 month before added
    const watchedTime = new Date('2025-12-01T10:00:00Z').toISOString();
    getStremioWatchedMovies.mockResolvedValueOnce([
      {
        id: 'tt0068646',
        name: 'The Godfather',
        watchedAt: watchedTime
      }
    ]);

    const result = await syncWatchedWithStremio('fake_auth_key', testUserId, {
      trackWatchlistWatched: true,
      syncPreviouslyWatched: false
    });

    expect(result.newlyMarked).toBe(0);
    const items = getItems(testUserId);
    const movie = items.find(i => i.id === 'tt0068646');
    expect(movie.isWatched).toBe(false);
  });

  test('marks previously watched movie when syncPreviouslyWatched is enabled', async () => {
    // 1. Add movie to watchlist at T0
    const addedTime = new Date('2026-01-05T10:00:00Z').toISOString();
    await addItem(
      {
        id: 'tt0068646',
        name: 'The Godfather',
        isWatched: false,
        addedAt: addedTime
      },
      testUserId
    );

    // 2. Stremio reports movie was watched 1 month before added
    const watchedTime = new Date('2025-12-01T10:00:00Z').toISOString();
    getStremioWatchedMovies.mockResolvedValueOnce([
      {
        id: 'tt0068646',
        name: 'The Godfather',
        watchedAt: watchedTime
      }
    ]);

    const result = await syncWatchedWithStremio('fake_auth_key', testUserId, {
      trackWatchlistWatched: true,
      syncPreviouslyWatched: true
    });

    expect(result.newlyMarked).toBe(1);
    const items = getItems(testUserId);
    const movie = items.find(i => i.id === 'tt0068646');
    expect(movie.isWatched).toBe(true);
  });

  test('does not import non-watchlist movies from Stremio library when syncPreviouslyWatched is false', async () => {
    getStremioWatchedMovies.mockResolvedValueOnce([
      {
        id: 'tt0468569',
        name: 'The Dark Knight',
        watchedAt: '2026-01-01T00:00:00Z'
      }
    ]);

    const result = await syncWatchedWithStremio('fake_auth_key', testUserId, {
      trackWatchlistWatched: true,
      syncPreviouslyWatched: false
    });

    expect(result.newlyAdded).toBe(0);
    const items = getItems(testUserId);
    expect(items.find(i => i.id === 'tt0468569')).toBeUndefined();
  });

  test('imports non-watchlist movies from Stremio library when syncPreviouslyWatched is true', async () => {
    getStremioWatchedMovies.mockResolvedValueOnce([
      {
        id: 'tt0468569',
        name: 'The Dark Knight',
        watchedAt: '2026-01-01T00:00:00Z'
      }
    ]);

    const result = await syncWatchedWithStremio('fake_auth_key', testUserId, {
      trackWatchlistWatched: true,
      syncPreviouslyWatched: true
    });

    expect(result.newlyAdded).toBe(1);
    const items = getItems(testUserId);
    const movie = items.find(i => i.id === 'tt0468569');
    expect(movie).toBeDefined();
    expect(movie.isWatched).toBe(true);
  });
});
