const { systemOperationService } = require('../services');
const { getRequestUser } = require('../utils/requestContext');

async function getAdminAnalyticsHandler(req, res) {
  try {
    const { user } = await getRequestUser(req);
    const analytics = await systemOperationService.getAdminAnalyticsReport({
      user,
      adminSecretHeader: req.headers['x-admin-secret'],
      timeRange: req.query.range || 'all',
    });

    return res.json({
      success: true,
      analytics,
    });
  } catch (err) {
    if (!err.statusCode) console.error('[Admin Analytics Error]', err);
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Failed to retrieve admin analytics.',
    });
  }
}

function registerAdminRoutes(app) {
  app.get('/api/admin/analytics', getAdminAnalyticsHandler);
}

module.exports = { registerAdminRoutes };
