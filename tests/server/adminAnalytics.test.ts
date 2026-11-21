const { adminRepository } = require('../../server/repositories/adminRepository');
const { registerAdminRoutes } = require('../../server/controllers/adminController');
const {
  calculatePercentage,
  calculateActiveUsers,
  calculateUserPreferenceMetrics,
  calculateWatchlistItemMetrics,
  calculateEventFunnelMetrics,
  formatPollMetrics,
  formatRecentEvents,
} = require('../../lib/adminAnalytics');
const db = require('../../lib/db');

describe('Admin Analytics & Access Control', () => {
  jest.setTimeout(15000);
  let routeHandler;

  beforeEach(() => {
    const app = {
      get: jest.fn((path, handler) => {
        if (path === '/api/admin/analytics') {
          routeHandler = handler;
        }
      }),
    };
    registerAdminRoutes(app);
  });

  const createMockReq = (headers = {}, query = {}) => ({
    headers,
    query,
    get: (h) => headers[h.toLowerCase()],
  });

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status: jest.fn().mockImplementation((code) => {
        res.statusCode = code;
        return res;
      }),
      json: jest.fn().mockImplementation((data) => {
        res.body = data;
        return res;
      }),
    };
    return res;
  };

  describe('adminRepository.getAdminAnalytics', () => {
    it('aggregates platform KPIs, service adoption, and top movies correctly', async () => {
      const analytics = await adminRepository.getAdminAnalytics('all');

      expect(analytics).toBeDefined();
      expect(analytics.kpis).toBeDefined();
      expect(typeof analytics.kpis.totalUsers).toBe('number');
      expect(typeof analytics.kpis.totalWatchlistItems).toBe('number');
      expect(analytics.serviceAdoption).toBeDefined();
      expect(analytics.serviceAdoption.addon).toBeDefined();
      expect(analytics.serviceAdoption.watchedSync).toBeDefined();
      expect(analytics.serviceAdoption.quality).toBeDefined();
      expect(Array.isArray(analytics.topMovies)).toBe(true);
      expect(analytics.pollResults).toBeDefined();
      expect(Array.isArray(analytics.eventsBreakdown)).toBe(true);
    });

    it('correctly calculates ready, waiting, and watched movie KPIs and top movie stats', async () => {
      const testUser = await db.resolveUser('admin_kpi_calc_user', () => ({ email: 'kpi_test@example.com' }));
      const userId = testUser.id;

      // Add a ready unwatched item
      await db.addItem(
        {
          id: 'tt1111111',
          name: 'Ready Movie',
          has1080pPlus: true,
          bestQuality: '1080p',
          isWatched: false,
        },
        userId
      );

      // Add a waiting unwatched item
      await db.addItem(
        {
          id: 'tt2222222',
          name: 'Waiting Movie',
          has1080pPlus: false,
          bestQuality: 'CAM',
          isWatched: false,
        },
        userId
      );

      // Add a watched item
      await db.addItem(
        {
          id: 'tt3333333',
          name: 'Watched Movie',
          has1080pPlus: true,
          bestQuality: '1080p',
          isWatched: true,
        },
        userId
      );

      const analytics = await adminRepository.getAdminAnalytics('all');

      expect(analytics.kpis.readyWatchlistItems).toBeGreaterThanOrEqual(1);
      expect(analytics.kpis.waitingWatchlistItems).toBeGreaterThanOrEqual(1);
      expect(analytics.kpis.watchedWatchlistItems).toBeGreaterThanOrEqual(1);
      expect(analytics.kpis.totalWatchlistItems).toBe(
        analytics.kpis.readyWatchlistItems + analytics.kpis.waitingWatchlistItems
      );

      // Check top movies readyCount
      const readyMovie = analytics.topMovies.find((m) => m.id === 'tt1111111');
      if (readyMovie) {
        expect(readyMovie.readyCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('aggregates poll results and formats breakdown and feedback correctly', async () => {
      const spy = jest.spyOn(db, 'getPollResults').mockResolvedValueOnce({
        totalVotes: 5,
        breakdown: { notifications: 3, tv_shows: 2 },
        votes: { notifications: 3, tv_shows: 2 },
        feedbackList: [
          { option: 'other', text: 'Please add trakt sync!', createdAt: '2026-11-18T00:00:00Z' },
        ],
        customFeedback: [
          { option: 'other', text: 'Please add trakt sync!', createdAt: '2026-11-18T00:00:00Z' },
        ],
      });

      const analytics = await adminRepository.getAdminAnalytics('all');

      expect(analytics.pollResults.totalVotes).toBe(5);
      expect(analytics.pollResults.breakdown.length).toBeGreaterThanOrEqual(2);
      expect(analytics.pollResults.breakdown[0].count).toBe(3);
      expect(analytics.pollResults.breakdown[0].percentage).toBe(60);
      expect(analytics.pollResults.customFeedback).toHaveLength(1);
      expect(analytics.pollResults.customFeedback[0].customText).toBe('Please add trakt sync!');

      spy.mockRestore();
    });
  });

  describe('GET /api/admin/analytics - Route Handler', () => {
    it('returns 403 Forbidden when request has no admin credentials', async () => {
      const req = createMockReq();
      const res = createMockRes();

      await routeHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('allows access when valid x-admin-secret header is provided', async () => {
      process.env.ADMIN_SECRET_KEY = 'super-secret-admin-pass';
      try {
        const req = createMockReq({ 'x-admin-secret': 'super-secret-admin-pass' });
        const res = createMockRes();

        await routeHandler(req, res);

        expect(res.body.success).toBe(true);
        expect(res.body.analytics).toBeDefined();
      } finally {
        delete process.env.ADMIN_SECRET_KEY;
      }
    });

    it('allows access when authenticated user has isAdmin: true', async () => {
      const adminAuthKey = 'test_admin_authkey_xyz';
      const user = await db.resolveUser(adminAuthKey, () => ({ email: 'admin_test@example.com' }));
      const bucket = db.findUserBucket(user.id);
      bucket.isAdmin = true;

      const req = createMockReq({ 'x-stremio-auth': adminAuthKey });
      const res = createMockRes();

      await routeHandler(req, res);

      expect(res.body.success).toBe(true);
      expect(res.body.analytics.kpis).toBeDefined();
    });

    it('rejects access when authenticated user has isAdmin: false', async () => {
      const standardAuthKey = 'test_standard_authkey_abc';
      const user = await db.resolveUser(standardAuthKey, () => ({ email: 'standard_test@example.com' }));
      const bucket = db.findUserBucket(user.id);
      bucket.isAdmin = false;

      const req = createMockReq({ 'x-stremio-auth': standardAuthKey });
      const res = createMockRes();

      await routeHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('adminAnalyticsService granular calculators', () => {
    it('calculatePercentage handles zero denominator and normal percentages', () => {
      expect(calculatePercentage(0, 0)).toBe(0);
      expect(calculatePercentage(3, 5)).toBe(60);
      expect(calculatePercentage(1, 3)).toBe(33);
    });

    it('calculateActiveUsers computes 24h, 7d, and 30d sets accurately', () => {
      const now = Date.now();
      const events = [
        { user_id: 'u1', created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
        { user_id: 'u2', created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString() },
        { user_id: 'u3', created_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString() },
      ];
      const active = calculateActiveUsers(events, now);
      expect(active.activeUsers24h).toBe(1);
      expect(active.activeUsers7d).toBe(2);
      expect(active.activeUsers30d).toBe(3);
    });

    it('calculateUserPreferenceMetrics aggregates quality, sync, and custom list counts', () => {
      const users = [
        { id: 'u1', settings: { minQuality: '4k', autoSyncWatched: true }, customLists: [{ id: 'l1' }] },
        { id: 'u2', settings: { minQuality: '1080p', syncPreviouslyWatched: true }, customLists: [] },
      ];
      const prefs = calculateUserPreferenceMetrics(users);
      expect(prefs.quality4kUsers).toBe(1);
      expect(prefs.quality1080pUsers).toBe(1);
      expect(prefs.autoSyncUsers).toBe(1);
      expect(prefs.syncPreviouslyWatchedUsers).toBe(1);
      expect(prefs.usersWithCustomListsCount).toBe(1);
      expect(prefs.totalListsCount).toBe(1);
    });

    it('calculateEventFunnelMetrics and formatRecentEvents process events cleanly', () => {
      const rawEvents = [
        { event_name: 'addon_manifest_copied', created_at: '2026-11-18T00:00:00Z' },
        { event_name: 'qr_code_scanned', created_at: '2026-11-18T00:01:00Z' },
        { event_name: 'qr_code_scanned', created_at: '2026-11-18T00:02:00Z' },
      ];
      const funnel = calculateEventFunnelMetrics(rawEvents);
      expect(funnel.manifestCopiedCount).toBe(1);
      expect(funnel.qrScannedCount).toBe(2);
      expect(funnel.eventsBreakdown[0].eventName).toBe('qr_code_scanned');

      const recent = formatRecentEvents(rawEvents, 2);
      expect(recent).toHaveLength(2);
    });

    it('deduplicates client mirror QR scans and ignores misattributed configure clicks', () => {
      const rawEvents = [
        // Genuine server scan
        {
          event_name: 'qr_code_scanned',
          created_at: '2026-11-20T10:00:00.000Z',
          metadata: { source: 'stremio_tv_qr', context: 'stremio_tv', ip: '192.168.1.5' },
        },
        // Client-side mirror fired 2 seconds later (duplicate)
        {
          event_name: 'qr_code_scanned',
          created_at: '2026-11-20T10:00:02.000Z',
          metadata: { source: 'stremio_tv_qr', context: 'stremio_tv' },
        },
        // Mislabeled configure event
        {
          event_name: 'qr_code_scanned',
          created_at: '2026-11-20T10:05:00.000Z',
          metadata: { source: 'stremio_configure', context: 'stremio_tv' },
        },
        // Separate server scan from another user
        {
          event_name: 'qr_code_scanned',
          created_at: '2026-11-20T10:10:00.000Z',
          metadata: { source: 'stremio_tv_qr', context: 'stremio_tv', ip: '10.0.0.1' },
        },
        // Landing viewed event
        {
          event_name: 'qr_landing_viewed',
          created_at: '2026-11-20T10:10:03.000Z',
          metadata: { source: 'stremio_tv_qr', context: 'stremio_tv' },
        },
      ];

      const funnel = calculateEventFunnelMetrics(rawEvents);
      // Only the 2 genuine server scans should be counted as qrScannedCount
      expect(funnel.qrScannedCount).toBe(2);

      const qrBreakdown = funnel.eventsBreakdown.find((b) => b.eventName === 'qr_code_scanned');
      expect(qrBreakdown?.count).toBe(2);

      const landingBreakdown = funnel.eventsBreakdown.find((b) => b.eventName === 'qr_landing_viewed');
      expect(landingBreakdown?.count).toBe(1);
    });
  });
});
