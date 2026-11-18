const db = require('../../lib/db');

describe('Database User Bulldoze / Account Deletion (lib/db.js)', () => {
  const testUserId = 'b0000000-0000-0000-0000-000000000002';
  const testEmail = 'bulldoze_user@example.com';
  const testAuthKey = 'auth_key_to_bulldoze';
  const originalFetch = global.fetch;

  let supabaseDeletedUrls: string[] = [];

  beforeAll(async () => {
    global.fetch = jest.fn().mockImplementation((url, options) => {
      const urlStr = String(url);
      if (options && options.method === 'DELETE') {
        supabaseDeletedUrls.push(urlStr);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
          text: async () => '',
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: testUserId,
            email: testEmail,
            stremio_auth_key: testAuthKey,
            min_quality: '1080p',
          },
        ],
        text: async () => '',
      });
    });

    await db.ensureLoaded();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    supabaseDeletedUrls = [];
    global.fetch = jest.fn().mockImplementation((url, options) => {
      const urlStr = String(url);
      if (options && options.method === 'DELETE') {
        supabaseDeletedUrls.push(urlStr);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
          text: async () => '',
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: testUserId,
            email: testEmail,
            stremio_auth_key: testAuthKey,
            min_quality: '1080p',
          },
        ],
        text: async () => '',
      });
    });

    await db.ensureLoaded(true);

    const bucket = db.ensureUserBucket(testUserId, testEmail);
    bucket.id = testUserId;
    bucket.email = testEmail;
    bucket.settings.stremioAuthKey = testAuthKey;

    // Populate user in memory and ensure bucket exists
    const user = await db.resolveUser(testAuthKey, () => ({ email: testEmail }));
    expect(user).toBeDefined();

    await db.addItem(
      {
        id: 'tt1111111',
        name: 'Bulldoze Movie 1',
        year: '2022',
        bestQuality: '1080p',
        has1080pPlus: true,
      },
      testUserId
    );

    await db.createCustomList(testUserId, { name: 'To Wipe Out', emoji: '💥' });
  });

  test('deleteUser bulldozes all movies, custom lists, events, and user record from database and cache', async () => {
    // Verify user and data exist prior to deletion
    expect(db.getItems(testUserId).length).toBeGreaterThan(0);
    expect(db.getCustomLists(testUserId).length).toBeGreaterThan(0);
    expect(db.findUserBucket(testUserId)).not.toBeNull();
    expect(db.findUserBucket(testEmail)).not.toBeNull();

    // Perform bulldoze deletion
    const result = await db.deleteUser(testUserId);
    expect(result.success).toBe(true);

    // 1. Verify in-memory cache is completely cleaned
    expect(db.findUserBucket(testUserId)).toBeNull();
    expect(db.findUserBucket(testEmail)).toBeNull();
    expect(db.getItems(testUserId)).toEqual([]);
    expect(db.getCustomLists(testUserId)).toEqual([]);

    // 2. Verify Supabase REST delete calls were dispatched for all user-related tables
    const deletedItems = supabaseDeletedUrls.some(
      (u) => u.includes('watchlist_items') && u.includes(testUserId)
    );
    const deletedLists = supabaseDeletedUrls.some(
      (u) => u.includes('watchlist_custom_lists') && u.includes(testUserId)
    );
    const deletedEvents = supabaseDeletedUrls.some(
      (u) => u.includes('analytics_events') && u.includes(testUserId)
    );
    const deletedUser = supabaseDeletedUrls.some((u) => u.includes('watchlist_users'));

    expect(deletedItems).toBe(true);
    expect(deletedLists).toBe(true);
    expect(deletedEvents).toBe(true);
    expect(deletedUser).toBe(true);
  });
});
