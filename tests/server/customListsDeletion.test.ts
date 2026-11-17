const {
  deleteCustomList,
  findUserBucket,
  addItem,
  ensureLoaded,
} = require('../../lib/db');

describe('Custom List Deletion and Movie Removal (lib/db.js)', () => {
  const testUserId = 'a0000000-0000-0000-0000-000000000001';
  const originalFetch = global.fetch;

  beforeAll(async () => {
    global.fetch = jest.fn().mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('watchlist_custom_lists')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        });
      }
      if (typeof url === 'string' && url.includes('watchlist_items')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: testUserId,
            email: 'test@example.com',
            stremio_auth_key: null,
            min_quality: '1080p',
          },
        ],
      });
    });

    await ensureLoaded();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const bucket = findUserBucket(testUserId);
    if (bucket) {
      bucket.customLists = [
        { id: 'list_netflix', name: 'New on Netflix', emoji: '🔴' },
        { id: 'list_favorites', name: 'Favorites', emoji: '⭐' },
      ];
      bucket.items = [
        {
          id: 'tt001',
          name: 'Netflix Only Movie',
          customLists: ['list_netflix'],
        },
        {
          id: 'tt002',
          name: 'Shared Movie in Both Lists',
          customLists: ['list_netflix', 'list_favorites'],
        },
        {
          id: 'tt003',
          name: 'Favorites Only Movie',
          customLists: ['list_favorites'],
        },
      ];
    }
  });

  test('deleting a custom list removes movies that belong only to it from the watchlist', async () => {
    const bucket = findUserBucket(testUserId);
    expect(bucket.items).toHaveLength(3);

    const result = await deleteCustomList(testUserId, 'list_netflix');

    expect(result.success).toBe(true);
    expect(result.deletedItemsCount).toBe(1);
    expect(result.deletedItemIds).toEqual(['tt001']);

    // List should be removed from customLists
    expect(bucket.customLists).toHaveLength(1);
    expect(bucket.customLists[0].id).toBe('list_favorites');

    // tt001 (which only belonged to list_netflix) must be completely removed from bucket.items
    const movie001 = bucket.items.find((i) => i.id === 'tt001');
    expect(movie001).toBeUndefined();

    // tt002 (which belonged to both list_netflix and list_favorites) must remain, with list_netflix removed
    const movie002 = bucket.items.find((i) => i.id === 'tt002');
    expect(movie002).toBeDefined();
    expect(movie002.customLists).toEqual(['list_favorites']);

    // tt003 (favorites only) must be unaffected
    const movie003 = bucket.items.find((i) => i.id === 'tt003');
    expect(movie003).toBeDefined();
    expect(movie003.customLists).toEqual(['list_favorites']);

    // Total items in watchlist is now 2
    expect(bucket.items).toHaveLength(2);
  });
});
