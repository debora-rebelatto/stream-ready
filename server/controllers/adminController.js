const { adminRepository } = require('../repositories');
const { getRequestUser } = require('../utils/requestContext');

function registerAdminRoutes(app) {
  app.get('/api/admin/analytics', async (req, res) => {
    try {
      const { user } = await getRequestUser(req);
      const adminSecretHeader = req.headers['x-admin-secret'];
      const envSecret = process.env.ADMIN_SECRET_KEY;

      const isSecretValid = Boolean(envSecret && adminSecretHeader && adminSecretHeader === envSecret);
      const isUserAdmin = Boolean(user && user.isAdmin);

      if (!isUserAdmin && !isSecretValid) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Admin access required.',
        });
      }

      const timeRange = req.query.range || 'all';
      const analytics = await adminRepository.getAdminAnalytics(timeRange);

      return res.json({
        success: true,
        analytics,
      });
    } catch (err) {
      console.error('[Admin Analytics Error]', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Failed to retrieve admin analytics.',
      });
    }
  });
}

module.exports = { registerAdminRoutes };
