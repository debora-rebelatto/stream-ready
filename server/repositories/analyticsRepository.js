const db = require('../../lib/db');

const analyticsRepository = {
  recordAnalyticsEvent: (event, data, userId) => db.recordAnalyticsEvent(event, data, userId),
  getAnalyticsStats: () => db.getAnalyticsStats(),
};

module.exports = { analyticsRepository };
