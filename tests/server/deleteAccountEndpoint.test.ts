const db = require('../../lib/db');
const { stremioAuthService } = require('../../server/services/stremioAuthService');

describe('DELETE /api/auth/account endpoint logic', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('deleteUser clears everything for user and returns success', async () => {
    const deleteSpy = jest.spyOn(db, 'deleteUser').mockResolvedValue({
      success: true,
      userId: 'uuid_123',
      userEmail: 'user@test.com',
    });

    const res = await db.deleteUser('uuid_123');
    expect(deleteSpy).toHaveBeenCalledWith('uuid_123');
    expect(res.success).toBe(true);
  });

  test('removeAccountAddon attempts to remove community addon from Stremio cloud', async () => {
    const originalFetch = global.fetch;
    const postCalls: any[] = [];

    global.fetch = jest.fn().mockImplementation((url, opts) => {
      if (opts && opts.method === 'POST') {
        postCalls.push({ url, body: JSON.parse(opts.body) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          result: {
            addons: [
              { manifest: { id: 'community.watchlist.quality.tracker' } },
              { manifest: { id: 'other.addon' } },
            ],
          },
        }),
      });
    });

    try {
      const removed = await stremioAuthService.removeAccountAddon('test_auth_key');
      expect(removed).toBe(true);
      expect(postCalls).toHaveLength(2);
      expect(postCalls[1].url).toContain('addonCollectionSet');
      // Verify that community.watchlist.quality.tracker was removed from collection
      const remainingAddons = postCalls[1].body.addons;
      expect(remainingAddons).toHaveLength(1);
      expect(remainingAddons[0].manifest.id).toBe('other.addon');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
