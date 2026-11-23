describe('Supabase User Upsert & Foreign Key Integrity', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function loadDbWithMockedSupabase() {
    jest.doMock('../../lib/db/supabaseClient', () => ({
      IS_TEST_ENV: false,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_KEY: 'test-service-role-key',
      DB_CACHE_TTL_MS: 180000,
      isSupabaseConfigured: () => true,
      getSupabaseHeaders: (extra = {}) => ({
        apikey: 'test-service-role-key',
        Authorization: 'Bearer test-service-role-key',
        'Content-Type': 'application/json',
        ...extra,
      }),
      fetchAllSupabaseRows: jest.fn(async (tablePath: string) => {
        const res = await fetch(`https://example.supabase.co/rest/v1/${tablePath}`);
        if (!res.ok) return null;
        return res.json();
      }),
    }));

    const syncStore = require('../../lib/db/syncStore');
    const userStore = require('../../lib/db/userStore');
    const analyticsStore = require('../../lib/db/analyticsStore');
    const memoryStore = require('../../lib/db/memoryStore');
    return { syncStore, userStore, analyticsStore, memoryStore };
  }

  test('supabaseSaveUser omits `id` from on_conflict=email upsert payload and reconciles stale cache UUID', async () => {
    const dbUuid = 'd0b28d2c-0ef3-4bd3-8211-9c4f29956e50';
    const capturedBodies: Array<Record<string, unknown>> = [];

    global.fetch = jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/rest/v1/watchlist_users?on_conflict=email') && options?.method === 'POST') {
        const parsed = JSON.parse(String(options.body));
        capturedBodies.push(parsed[0]);
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: dbUuid,
              email: 'existing@example.com',
              created_at: '2026-11-12T19:00:00.000Z',
            },
          ],
          text: async () => '',
        };
      }
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    }) as unknown as typeof fetch;

    const { syncStore, memoryStore } = loadDbWithMockedSupabase();
    const bucket = memoryStore.ensureUserBucket('existing@example.com');
    const tempUuid = bucket.id;
    expect(tempUuid).not.toBe(dbUuid);

    const saved = await syncStore.supabaseSaveUser(bucket);
    expect(saved).toBe(true);

    // Payload must NEVER contain `id` so Postgres never mutates the PK on conflict
    expect(capturedBodies).toHaveLength(1);
    expect(capturedBodies[0]).not.toHaveProperty('id');
    expect(capturedBodies[0].email).toBe('existing@example.com');

    // Bucket and cache must be reconciled to the authoritative DB UUID
    const cache = memoryStore.initMemoryCache();
    expect(bucket.id).toBe(dbUuid);
    expect(cache.usersById[dbUuid]).toBe(bucket);
    expect(cache.users[dbUuid]).toBe(bucket);
    expect(cache.usersById[tempUuid]).toBeUndefined();
    expect(cache.users[tempUuid]).toBeUndefined();
  });

  test('resolveUser forces Supabase reload on email cache miss to preserve existing user ID and settings', async () => {
    const dbUuid = 'd0b28d2c-0ef3-4bd3-8211-9c4f29956e50';
    let userListFetchCount = 0;
    const upsertPayloads: Array<Record<string, unknown>> = [];

    global.fetch = jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/rest/v1/watchlist_users?select=')) {
        userListFetchCount++;
        // Simulate stale first sync (user created on another Lambda right after)
        const rows =
          userListFetchCount === 1
            ? []
            : [
                {
                  id: dbUuid,
                  email: 'cross-lambda@example.com',
                  min_quality: '4k',
                  onboarding_completed: true,
                },
              ];
        return { ok: true, status: 200, json: async () => rows, text: async () => '' };
      }
      if (url.includes('/rest/v1/watchlist_users?on_conflict=email') && options?.method === 'POST') {
        const parsed = JSON.parse(String(options.body));
        upsertPayloads.push(parsed[0]);
        return {
          ok: true,
          status: 200,
          json: async () => [{ id: dbUuid, email: 'cross-lambda@example.com' }],
          text: async () => '',
        };
      }
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    }) as unknown as typeof fetch;

    const { userStore, syncStore } = loadDbWithMockedSupabase();
    await syncStore.ensureLoaded(true);

    const resolved = await userStore.resolveUser('fresh_stremio_auth_key', async () => ({
      email: 'cross-lambda@example.com',
    }));

    expect(resolved).toMatchObject({
      id: dbUuid,
      email: 'cross-lambda@example.com',
      onboardingCompleted: true,
    });
    expect(userListFetchCount).toBe(2);
    expect(upsertPayloads).toHaveLength(1);
    expect(upsertPayloads[0].min_quality).toBe('4k');
    expect(upsertPayloads[0]).not.toHaveProperty('id');
  });

  test('deleteUser deletes child tables before deleting parent watchlist_users row', async () => {
    const dbUuid = 'a0000000-0000-0000-0000-000000000009';
    const deleteOrder: string[] = [];

    global.fetch = jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (options?.method === 'DELETE') {
        deleteOrder.push(url);
        return { ok: true, status: 200, json: async () => [], text: async () => '' };
      }
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    }) as unknown as typeof fetch;

    const { userStore, memoryStore } = loadDbWithMockedSupabase();
    const bucket = memoryStore.ensureUserBucket(dbUuid, 'delete-order@example.com');
    bucket.id = dbUuid;

    const res = await userStore.deleteUser(dbUuid);
    expect(res.success).toBe(true);

    const firstParentDeleteIdx = deleteOrder.findIndex((u) => u.includes('/watchlist_users?'));
    const childDeleteIndices = deleteOrder
      .map((u, idx) => (!u.includes('/watchlist_users?') ? idx : -1))
      .filter((idx) => idx !== -1);

    expect(firstParentDeleteIdx).toBeGreaterThan(-1);
    expect(childDeleteIndices.length).toBe(4);
    for (const childIdx of childDeleteIndices) {
      expect(childIdx).toBeLessThan(firstParentDeleteIdx);
    }
  });

  test('recordAnalyticsEvent sanitizes non-UUID user_id and retries anonymously on 409 FK conflict', async () => {
    const postBodies: Array<Record<string, unknown>> = [];
    let attempt = 0;

    global.fetch = jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      if (url.includes('/rest/v1/analytics_events') && options?.method === 'POST') {
        attempt++;
        const parsed = JSON.parse(String(options.body));
        postBodies.push(parsed[0]);
        if (attempt === 1) {
          return { ok: false, status: 409, text: async () => '23503 foreign key violation' };
        }
        return { ok: true, status: 201, text: async () => '' };
      }
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    }) as unknown as typeof fetch;

    const { analyticsStore } = loadDbWithMockedSupabase();

    // 1. Valid UUID triggers 409 -> retries once with user_id: null
    const okAfterRetry = await analyticsStore.recordAnalyticsEvent(
      'page_view',
      { path: '/' },
      'c3d032e2-fd17-42ac-bde5-e74a71c1568a'
    );
    expect(okAfterRetry).toBe(true);
    expect(postBodies).toHaveLength(2);
    expect(postBodies[0].user_id).toBe('c3d032e2-fd17-42ac-bde5-e74a71c1568a');
    expect(postBodies[1].user_id).toBeNull();

    // 2. Non-UUID string is normalized to null immediately
    const okNonUuid = await analyticsStore.recordAnalyticsEvent(
      'page_view',
      { path: '/' },
      'usr_not_a_uuid'
    );
    expect(okNonUuid).toBe(true);
    expect(postBodies[2].user_id).toBeNull();
  });
});
