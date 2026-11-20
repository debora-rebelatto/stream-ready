const { userRepository, watchlistRepository } = require('../repositories');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { searchMovies, getMeta } = require('../../lib/cinemeta');
const { getAccountWatchlist } = require('../../lib/stremioAuth');
const tmdb = require('../../lib/tmdb');
const {
  syncAddonUrlWithAccount,
  triggerUserOnDemandSync,
} = require('../utils/requestContext');

async function restoreCloudWatchlistIfEmpty(authKey, userId, logPrefix = 'watchlist') {
  if (!authKey || !userId) return;
  if (watchlistRepository.getItems(userId).length > 0) return;

  try {
    const cloudItems = await getAccountWatchlist(authKey);
    if (Array.isArray(cloudItems) && cloudItems.length > 0) {
      for (const it of cloudItems) {
        if (!watchlistRepository.getItem(it.id, userId)) {
          await watchlistRepository.addItem(it, userId);
        }
      }
    }
  } catch (e) {
    console.warn(`[Persistence:${logPrefix}] Cloud restore warning:`, e.message);
  }
}

async function listUserItems({ authKey, userId, filter, tab, listId }) {
  await userRepository.ensureLoaded(Boolean(process.env.VERCEL));

  if (!authKey || !userId) {
    return {
      items: [],
      stats: { total: 0, ready: 0, pending: 0 },
      requireAuth: true,
    };
  }

  triggerUserOnDemandSync(authKey, userId);
  await restoreCloudWatchlistIfEmpty(authKey, userId, 'api/items');

  const effectiveFilter = tab || filter;
  let items = watchlistRepository.getItems(userId);
  const userSettings = userRepository.getSettings(userId);
  const globalMinQuality = userSettings.minQuality || '1080p';

  if (listId) {
    items = items.filter((i) => Array.isArray(i.customLists) && i.customLists.includes(listId));
  }

  if (effectiveFilter === 'watched') {
    items = items.filter((i) => Boolean(i.isWatched));
  } else if (effectiveFilter === 'ready') {
    items = items.filter(
      (i) => !i.isWatched && watchlistRepository.isItemReady(i, globalMinQuality)
    );
  } else if (effectiveFilter === 'pending') {
    items = items.filter(
      (i) =>
        !i.isWatched &&
        !watchlistRepository.isItemReady(i, globalMinQuality) &&
        !watchlistRepository.isItemUnreleased(i)
    );
  } else if (effectiveFilter === 'unreleased') {
    items = items.filter((i) => !i.isWatched && watchlistRepository.isItemUnreleased(i));
  } else if (effectiveFilter === 'unwatched') {
    items = items.filter((i) => !i.isWatched);
  }

  return {
    items,
    stats: watchlistRepository.getStats(userId),
    requireAuth: false,
  };
}

async function searchMovieCatalog(query = '') {
  if (!String(query).trim()) return [];
  const results = await searchMovies(query);
  return (results || []).filter((item) => !item.type || item.type === 'movie');
}

async function getTrendingMovies(rawLimit) {
  const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 9, 1), 20);
  return tmdb.getTrendingMovies(limit);
}

async function getTopCommunityMovies(rawLimit) {
  await userRepository.ensureLoaded();
  const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 3, 1), 20);
  return watchlistRepository.getTopMovies(limit);
}

async function addMovieToWatchlist({ authKey, userId, id, type = 'movie', baseUrl }) {
  if (type === 'series') {
    const err = new Error('Only movies are supported. Series cannot be added.');
    err.statusCode = 400;
    throw err;
  }
  if (!id) {
    const err = new Error('Movie ID is required (e.g. tt1234567)');
    err.statusCode = 400;
    throw err;
  }

  let normalizedId = String(id);
  const imdbMatch = normalizedId.match(/tt\d{7,8}/i);
  if (imdbMatch) {
    normalizedId = imdbMatch[0];
  }

  const existing = watchlistRepository.getItem(normalizedId, userId);
  if (existing) {
    return {
      success: true,
      item: existing,
      stats: watchlistRepository.getStats(userId),
      message: 'Item is already in your watchlist',
    };
  }

  const meta = await getMeta('movie', normalizedId);
  if (!meta || (meta.type && meta.type !== 'movie')) {
    const err = new Error('Only movies are supported. Series cannot be added.');
    err.statusCode = 400;
    throw err;
  }

  const quality = await checkMovieQuality(normalizedId, 'movie', meta.name, meta.year);

  const saved = await watchlistRepository.addItem(
    {
      id: meta.id,
      type: 'movie',
      name: meta.name,
      year: meta.year,
      poster: meta.poster,
      imdbRating: meta.imdbRating ? String(meta.imdbRating) : '',
      has1080pPlus: quality.has1080pPlus,
      bestQuality: quality.bestQuality,
      streamCount: quality.streamCount,
      lastChecked: quality.checkedAt,
    },
    userId
  );

  if (baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return { success: true, item: saved, stats: watchlistRepository.getStats(userId) };
}

async function recheckSingleMovie({ userId, id }) {
  const item = watchlistRepository.getItem(id, userId);
  if (!item) {
    const err = new Error('Item not found in watchlist');
    err.statusCode = 404;
    throw err;
  }

  const quality = await checkMovieQuality(id, item.type || 'movie', item.name, item.year);
  const wasReady = item.has1080pPlus;

  const updated = await watchlistRepository.updateItem(
    id,
    {
      has1080pPlus: quality.has1080pPlus,
      bestQuality: quality.bestQuality,
      streamCount: quality.streamCount,
      lastChecked: quality.checkedAt,
    },
    userId
  );

  return {
    success: true,
    item: updated,
    becameReady: !wasReady && quality.has1080pPlus,
  };
}

async function recheckAllMovies({ userId, forceAll = true }) {
  let items = watchlistRepository.getItems(userId).filter((i) => !i.isWatched);
  if (forceAll === false) {
    items = items.filter((i) => !i.has1080pPlus);
  }

  let newlyReady = 0;

  for (const item of items) {
    const quality = await checkMovieQuality(
      item.id,
      item.type || 'movie',
      item.name,
      item.year
    );
    const wasReady = item.has1080pPlus;

    await watchlistRepository.updateItem(
      item.id,
      {
        has1080pPlus: quality.has1080pPlus,
        bestQuality: quality.bestQuality,
        streamCount: quality.streamCount,
        count1080pPlus: quality.count1080pPlus,
        lastChecked: quality.checkedAt,
        checkError: quality.error || null,
      },
      userId
    );

    if (!wasReady && quality.has1080pPlus) {
      newlyReady++;
    }

    await new Promise((r) => setTimeout(r, 600));
  }

  return {
    success: true,
    checkedCount: items.length,
    newlyReady,
    stats: watchlistRepository.getStats(userId),
  };
}

async function removeMovie({ authKey, userId, id, baseUrl }) {
  const removed = await watchlistRepository.removeItem(id, userId);
  if (baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }
  return {
    success: removed,
    stats: watchlistRepository.getStats(userId),
  };
}

async function toggleMovieWatched({ authKey, userId, id, watched, baseUrl }) {
  const updated = await watchlistRepository.setWatched(id, watched !== false, userId);
  if (!updated) {
    const err = new Error('Item not found in watchlist');
    err.statusCode = 404;
    throw err;
  }

  if (baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return {
    success: true,
    item: updated,
    stats: watchlistRepository.getStats(userId),
  };
}

async function syncWatchedHistory({ authKey, userId, baseUrl }) {
  const result = await watchlistRepository.syncWatchedWithStremio(authKey, userId);

  if (baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return {
    success: true,
    result,
    items: watchlistRepository.getItems(userId),
    stats: watchlistRepository.getStats(userId),
  };
}

async function syncClientBatch({ authKey, userId, clientItems, baseUrl }) {
  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    return {
      success: true,
      count: 0,
      items: watchlistRepository.getItems(userId),
      stats: watchlistRepository.getStats(userId),
    };
  }

  let added = 0;
  for (const item of clientItems) {
    if (!item || !item.id) continue;
    if (!watchlistRepository.getItem(item.id, userId)) {
      watchlistRepository.addItem(item, userId);
      added++;
      if (
        !item.bestQuality ||
        item.bestQuality === 'Pending' ||
        item.bestQuality === 'Pendente' ||
        item.bestQuality === 'Checking...' ||
        item.bestQuality === 'Verificando...'
      ) {
        checkMovieQuality(item.id, item.type || 'movie', item.name, item.year)
          .then((q) => {
            if (q) {
              watchlistRepository.updateItem(
                item.id,
                {
                  has1080pPlus: q.has1080pPlus,
                  bestQuality: q.bestQuality,
                  streamCount: q.streamCount,
                },
                userId
              );
            }
          })
          .catch(() => {});
      }
    }
  }

  if (added > 0 && baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return {
    success: true,
    added,
    items: watchlistRepository.getItems(userId),
    stats: watchlistRepository.getStats(userId),
  };
}

async function exportWatchlist({ authKey, userId }) {
  await userRepository.ensureLoaded();
  await restoreCloudWatchlistIfEmpty(authKey, userId, 'api/export');
  return watchlistRepository.getItems(userId);
}

async function importWatchlist({ authKey, userId, items, baseUrl }) {
  await userRepository.ensureLoaded();
  if (!Array.isArray(items)) {
    const err = new Error('Invalid items array');
    err.statusCode = 400;
    throw err;
  }

  let addedCount = 0;
  for (const item of items) {
    if (item && item.id && item.name) {
      watchlistRepository.addItem(item, userId);
      addedCount++;
    }
  }

  if (addedCount > 0 && authKey && baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return {
    success: true,
    addedCount,
    stats: watchlistRepository.getStats(userId),
  };
}

const watchlistOperationService = {
  restoreCloudWatchlistIfEmpty,
  listUserItems,
  searchMovieCatalog,
  getTrendingMovies,
  getTopCommunityMovies,
  addMovieToWatchlist,
  recheckSingleMovie,
  recheckAllMovies,
  removeMovie,
  toggleMovieWatched,
  syncWatchedHistory,
  syncClientBatch,
  exportWatchlist,
  importWatchlist,
};

module.exports = { watchlistOperationService };
