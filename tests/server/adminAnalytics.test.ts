const { adminRepository } = require('../../server/repositories/adminRepository');
const { registerAdminRoutes } = require('../../server/controllers/adminController');
const db = require('../../lib/db');

describe('Admin Analytics & Access Control', () => {
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
});
