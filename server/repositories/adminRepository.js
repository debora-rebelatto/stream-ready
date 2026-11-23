const db = require('../../lib/db');
const { buildAdminAnalyticsReport } = require('../../lib/adminAnalytics');
const { watchlistRepository } = require('./watchlistRepository');

/**
 * Retrieves raw user/item/event data from the persistence layer and delegates
 * report aggregation to adminAnalyticsService (lib/adminAnalytics).
 */
async function getAdminAnalytics(timeRange = 'all') {
  await db.ensureLoaded();

  const users = db.getAllUsers() || [];
  const allUserItems = db.getAllUsersItems() || [];
  const rawEvents = (await db.getAnalyticsRawEvents(5000)) || [];
  const pollResults = (await db.getPollResults()) || {
    totalVotes: 0,
    votes: {},
    customFeedback: [],
  };
  const topMovies = watchlistRepository.getTopMovies(10);

  return buildAdminAnalyticsReport({
    users,
    allUserItems,
    rawEvents,
    pollResults,
    topMovies,
    timeRange,
    isItemReady: db.isItemReady ? (item, minQ) => db.isItemReady(item, minQ) : undefined,
  });
}

const adminRepository = {
  getAdminAnalytics,
};

module.exports = { adminRepository };
