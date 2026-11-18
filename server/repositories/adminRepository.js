const db = require('../../lib/db');
const { watchlistRepository } = require('./watchlistRepository');

/**
 * Aggregates user metrics, service adoption funnels, and feature usage for the admin dashboard.
 */
async function getAdminAnalytics() {
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
  let waitingCount = 0;
  let watchedCount = 0;
  let activeWatchlistCount = 0;
  let totalListsCount = 0;
  let usersWithCustomListsCount = 0;

  // Stremio sync adoption counters
  let trackWatchlistUsers = 0;
  let autoSyncUsers = 0;
  let syncPreviouslyWatchedUsers = 0;
  let quality1080pUsers = 0;
  let quality4kUsers = 0;

  // Map of userId -> user settings to evaluate item readiness based on preference
  const userSettingsMap = new Map();

  for (const u of users) {
    if (u && u.id) {
      userSettingsMap.set(u.id, u.settings || {});
    }

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

    const isWatched = Boolean(item.isWatched || item.watched);
    if (isWatched) {
      watchedCount++;
    } else {
      activeWatchlistCount++;
      const userSettings = userSettingsMap.get(entry.userId) || {};
      const userMinQuality = userSettings.minQuality || '1080p';
      const isReady = db.isItemReady ? db.isItemReady(item, userMinQuality) : Boolean(item.has1080pPlus || item.isReady);
      if (isReady) {
        readyCount++;
      } else {
        waitingCount++;
      }
    }
  }

  const totalUsers = users.length;
  // Active watchlist items represents movies actively on the watchlist (unwatched)
  const totalWatchlistItems = activeWatchlistCount;
  const totalTrackedItems = allUserItems.length;
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
  const topMovies = watchlistRepository.getTopMovies(10);

  // 5. Poll Results formatting
  const totalPollVotes = pollResults.totalVotes || 0;
  const rawVotes = pollResults.breakdown || pollResults.votes || {};

  const OPTION_LABELS = {
    notifications: 'Automated notifications (Telegram/Discord/Email)',
    tv_shows: 'TV Shows and Series support',
    import_lists: '1-Click import from Letterboxd/Trakt/IMDb',
    debrid_filters: 'Real-Debrid and provider source filtering',
    share_lists: 'Public list sharing with friends',
    other: 'Other community ideas',
  };

  const pollBreakdown = Object.entries(rawVotes)
    .map(([option, count]) => {
      const label = OPTION_LABELS[option] || option;
      const countNum = Number(count || 0);
      return {
        option: label,
        rawOption: option,
        count: countNum,
        percentage: totalPollVotes > 0 ? Math.round((countNum / totalPollVotes) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const rawFeedback = pollResults.customFeedback || pollResults.feedbackList || [];
  const customFeedback = (Array.isArray(rawFeedback) ? rawFeedback : [])
    .map((fb) => ({
      customText: fb.customText || fb.text || fb.custom_text || '',
      option: OPTION_LABELS[fb.option] || fb.option || '',
      createdAt: fb.createdAt || fb.created_at || '',
    }))
    .filter((fb) => Boolean(fb.customText));

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
      totalTrackedItems,
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
      customFeedback,
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
