const db = require('../../lib/db');

/**
 * Aggregates user metrics, service adoption funnels, and feature usage for the admin dashboard.
 */
async function getAdminAnalytics(timeRange = 'all') {
  await db.ensureLoaded();

  const users = db.getAllUsers() || [];
  const allUserItems = db.getAllUsersItems() || [];
  const rawEvents = (await db.getAnalyticsRawEvents(5000)) || [];
  const pollResults = (await db.getPollResults()) || { totalVotes: 0, votes: {}, customFeedback: [] };

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;
  const THIRTY_DAYS = 30 * ONE_DAY;

  // 1. Calculate Active Users based on event timestamps and user_id
  const active24hSet = new Set();
  const active7dSet = new Set();
  const active30dSet = new Set();

  for (const ev of rawEvents) {
    if (!ev.created_at) continue;
    const evTime = new Date(ev.created_at).getTime();
    if (isNaN(evTime)) continue;

    const diff = now - evTime;
    const identifier = ev.user_id || ev.metadata?.ip || ev.metadata?.source || null;
    if (!identifier) continue;

    if (diff <= ONE_DAY) active24hSet.add(identifier);
    if (diff <= SEVEN_DAYS) active7dSet.add(identifier);
    if (diff <= THIRTY_DAYS) active30dSet.add(identifier);
  }

  // 2. Watchlist Quality & Watched KPIs
  let readyCount = 0;
  let watchedCount = 0;
  let totalListsCount = 0;
  let usersWithCustomListsCount = 0;

  // Stremio sync adoption counters
  let trackWatchlistUsers = 0;
  let autoSyncUsers = 0;
  let syncPreviouslyWatchedUsers = 0;
  let quality1080pUsers = 0;
  let quality4kUsers = 0;

  for (const u of users) {
    const s = u.settings || {};
    if (s.trackWatchlistWatched !== false) trackWatchlistUsers++;
    if (s.autoSyncWatched) autoSyncUsers++;
    if (s.syncPreviouslyWatched) syncPreviouslyWatchedUsers++;

    if (s.minQuality === '4k') {
      quality4kUsers++;
    } else {
      quality1080pUsers++;
    }

    const lists = u.customLists || [];
    if (lists.length > 0) {
      usersWithCustomListsCount++;
      totalListsCount += lists.length;
    }
  }

  for (const entry of allUserItems) {
    const item = entry.item;
    if (!item) continue;
    if (item.watched) {
      watchedCount++;
    } else if (item.isReady) {
      readyCount++;
    }
  }

  const totalUsers = users.length;
  const totalWatchlistItems = allUserItems.length;
  const waitingCount = Math.max(0, totalWatchlistItems - readyCount - watchedCount);
  const avgMoviesPerUser = totalUsers > 0 ? Number((totalWatchlistItems / totalUsers).toFixed(1)) : 0;

  // 3. Service Adoption Funnel from Raw Events
  let manifestCopiedCount = 0;
  let installClickedCount = 0;
  let qrScannedCount = 0;
  let curatedListAddedEvents = 0;
  const eventCounts = {};

  for (const ev of rawEvents) {
    const name = ev.event_name;
    if (!name) continue;
    eventCounts[name] = (eventCounts[name] || 0) + 1;

    if (name === 'addon_manifest_copied') manifestCopiedCount++;
    if (name === 'addon_install_clicked') installClickedCount++;
    if (name === 'qr_code_scanned') qrScannedCount++;
    if (name === 'curated_list_added') curatedListAddedEvents++;
  }

  // 4. Community Top 10 Movies
  const movieMap = new Map();

  for (const entry of allUserItems) {
    const it = entry.item;
    if (!it || !it.id) continue;
    const movieId = db.cleanImdbId(it.id);
    if (!movieId) continue;

    const existing = movieMap.get(movieId) || {
      id: movieId,
      name: it.name || it.title || 'Unknown Title',
      year: it.year,
      userCount: 0,
      readyCount: 0,
      poster: it.poster,
    };

    existing.userCount++;
    if (it.isReady) existing.readyCount++;
    if (!existing.poster && it.poster) existing.poster = it.poster;

    movieMap.set(movieId, existing);
  }

  const topMovies = Array.from(movieMap.values())
    .sort((a, b) => b.userCount - a.userCount)
    .slice(0, 10);

  // 5. Poll Results formatting
  const totalPollVotes = pollResults.totalVotes || 0;
  const pollBreakdown = Object.entries(pollResults.votes || {}).map(([option, count]) => ({
    option,
    count,
    percentage: totalPollVotes > 0 ? Math.round((count / totalPollVotes) * 100) : 0,
  }));

  // 6. Events Breakdown
  const eventsBreakdown = Object.entries(eventCounts)
    .map(([eventName, count]) => ({ eventName, count }))
    .sort((a, b) => b.count - a.count);

  const recentEvents = rawEvents.slice(0, 20).map((ev) => ({
    eventName: ev.event_name,
    createdAt: ev.created_at,
    metadata: ev.metadata,
  }));

  return {
    kpis: {
      totalUsers,
      activeUsers24h: active24hSet.size,
      activeUsers7d: active7dSet.size,
      activeUsers30d: active30dSet.size,
      totalWatchlistItems,
      readyWatchlistItems: readyCount,
      waitingWatchlistItems: waitingCount,
      watchedWatchlistItems: watchedCount,
      avgMoviesPerUser,
      totalCustomLists: totalListsCount,
    },
    serviceAdoption: {
      addon: {
        manifestCopiedCount,
        installClickedCount,
        qrScannedCount,
      },
      watchedSync: {
        trackWatchlistUsers,
        trackWatchlistPercent: totalUsers > 0 ? Math.round((trackWatchlistUsers / totalUsers) * 100) : 0,
        autoSyncUsers,
        autoSyncPercent: totalUsers > 0 ? Math.round((autoSyncUsers / totalUsers) * 100) : 0,
        syncPreviouslyWatchedUsers,
        syncPreviouslyWatchedPercent: totalUsers > 0 ? Math.round((syncPreviouslyWatchedUsers / totalUsers) * 100) : 0,
      },
      quality: {
        quality1080pUsers,
        quality4kUsers,
        quality1080pPercent: totalUsers > 0 ? Math.round((quality1080pUsers / totalUsers) * 100) : 0,
        quality4kPercent: totalUsers > 0 ? Math.round((quality4kUsers / totalUsers) * 100) : 0,
      },
      customLists: {
        usersWithCustomLists: usersWithCustomListsCount,
        curatedListAddedEvents,
      },
    },
    topMovies,
    pollResults: {
      totalVotes: totalPollVotes,
      breakdown: pollBreakdown,
      customFeedback: pollResults.customFeedback || [],
    },
    eventsBreakdown,
    recentEvents,
    generatedAt: new Date().toISOString(),
  };
}

const adminRepository = {
  getAdminAnalytics,
};

module.exports = { adminRepository };
