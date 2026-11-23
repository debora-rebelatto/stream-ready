const { initMemoryCache, findUserBucket, ensureUserBucket } = require('./memoryStore');
const {
  cleanImdbId,
  isLegitimateMovieId,
  normalizeItem,
  enrichWatchlistItem,
  computeWatchlistStats,
} = require('./itemMapper');
const { supabaseSaveUser, supabaseUpsertItems, supabaseDeleteItem } = require('./syncStore');
const { getSettings } = require('./userStore');

function getItems(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  return bucket ? bucket.items : [];
}

function getAllUsersItems() {
  const cache = initMemoryCache();
  const result = [];
  const processedUids = new Set();
  for (const bucket of Object.values(cache.usersById)) {
    if (!bucket || !bucket.id || processedUids.has(bucket.id)) continue;
    processedUids.add(bucket.id);
    for (const item of bucket.items || []) {
      result.push({ userId: bucket.id, userEmail: bucket.email, item });
    }
  }
  return result;
}

function getItem(id, userIdentifier) {
  const cleanId = cleanImdbId(id);
  const items = getItems(userIdentifier);
  return items.find((item) => item.id === cleanId);
}

async function addItem(item, userIdentifier) {
  let bucket = findUserBucket(userIdentifier);
  if (!bucket) {
    bucket = ensureUserBucket(userIdentifier);
    if (!bucket.id) {
      await supabaseSaveUser(bucket);
    }
  }
  if (!bucket || !bucket.id) return null;

  const cleanId = cleanImdbId(item.id);
  if (!isLegitimateMovieId(cleanId)) return null;
  const existingIndex = bucket.items.findIndex((i) => i.id === cleanId);
  const newItem = normalizeItem(
    {
      ...(existingIndex >= 0 ? bucket.items[existingIndex] : {}),
      ...item,
      id: cleanId,
    },
    bucket.id
  );

  if (existingIndex >= 0) {
    bucket.items[existingIndex] = newItem;
  } else {
    bucket.items.unshift(newItem);
  }

  await supabaseUpsertItems([newItem], bucket.id);
  return newItem;
}

async function updateItem(id, updates, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) return null;
  const cleanId = cleanImdbId(id);
  const index = bucket.items.findIndex((i) => i.id === cleanId);
  if (index >= 0) {
    bucket.items[index] = normalizeItem(
      { ...bucket.items[index], ...updates, id: cleanId },
      bucket.id
    );
    await supabaseUpsertItems([bucket.items[index]], bucket.id);
    return bucket.items[index];
  }
  return null;
}

async function removeItem(id, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) return false;
  const cleanId = cleanImdbId(id);
  const initialLength = bucket.items.length;
  bucket.items = bucket.items.filter((i) => i.id !== cleanId);
  const removed = bucket.items.length < initialLength;
  if (removed) {
    await supabaseDeleteItem(cleanId, bucket.id);
  }
  return removed;
}

async function setWatched(id, isWatched, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) return null;
  const cleanId = cleanImdbId(id);
  const index = bucket.items.findIndex((i) => i.id === cleanId);
  if (index >= 0) {
    const item = bucket.items[index];
    item.isWatched = Boolean(isWatched);
    item.watchedAt = isWatched ? new Date().toISOString() : null;
    await supabaseUpsertItems([item], bucket.id);
    return item;
  }
  return null;
}

function getUserQualityCriteria(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  return {
    minQuality: bucket?.settings?.minQuality || '1080p',
    minAudio: bucket?.settings?.minAudio || 'any',
  };
}

function getEnrichedItems(userIdentifier) {
  const items = getItems(userIdentifier);
  const criteria = getUserQualityCriteria(userIdentifier);
  return items.map((item) => enrichWatchlistItem(item, criteria));
}

function getStats(userIdentifier) {
  const items = getItems(userIdentifier);
  const criteria = getUserQualityCriteria(userIdentifier);
  return computeWatchlistStats(items, criteria);
}

async function syncWatchedWithStremio(authKey, userIdentifier, options = {}) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id || !authKey) {
    return {
      count: 0,
      newlyMarked: 0,
      newlyAdded: 0,
      totalWatched: 0,
      stats: getStats(userIdentifier),
    };
  }

  const settings = getSettings(bucket.id);
  const trackWatchlist =
    options.trackWatchlistWatched !== undefined
      ? Boolean(options.trackWatchlistWatched)
      : settings.trackWatchlistWatched !== false;
  const syncPrevious =
    options.syncPreviouslyWatched !== undefined
      ? Boolean(options.syncPreviouslyWatched)
      : Boolean(settings.syncPreviouslyWatched);

  if (!trackWatchlist && !syncPrevious) {
    return {
      count: 0,
      newlyMarked: 0,
      newlyAdded: 0,
      totalWatched: bucket.items.filter((i) => i.isWatched).length,
      stats: getStats(bucket.id),
    };
  }

  const { getStremioWatchedMovies } = require('../stremioAuth');
  const watchedFromStremio = await getStremioWatchedMovies(authKey);
  if (!Array.isArray(watchedFromStremio) || watchedFromStremio.length === 0) {
    return {
      count: 0,
      newlyMarked: 0,
      newlyAdded: 0,
      totalWatched: bucket.items.filter((i) => i.isWatched).length,
      stats: getStats(bucket.id),
    };
  }

  const itemsToUpsert = [];
  let newlyMarked = 0;
  let newlyAdded = 0;
  const { getMeta } = require('../cinemeta');

  for (const watchedItem of watchedFromStremio) {
    const cleanId = cleanImdbId(watchedItem.id);
    if (!isLegitimateMovieId(cleanId)) continue;
    const existingIndex = bucket.items.findIndex((i) => i.id === cleanId);

    // Enrich missing year/metadata from Cinemeta when Stremio omits it
    if ((!watchedItem.year || String(watchedItem.year).trim() === '') && cleanId) {
      try {
        const meta = await getMeta(watchedItem.type || 'movie', cleanId);
        if (meta && meta.year) {
          watchedItem.year = String(meta.year);
          if (meta.name && (!watchedItem.name || watchedItem.name === cleanId)) {
            watchedItem.name = meta.name;
          }
          if (meta.poster && !watchedItem.poster) {
            watchedItem.poster = meta.poster;
          }
          if (meta.imdbRating) {
            watchedItem.imdbRating = String(meta.imdbRating);
          }
        }
      } catch (err) {
        console.warn('[DB] Cinemeta enrichment skipped during watched sync:', err.message);
      }
    }

    if (existingIndex >= 0) {
      const existing = bucket.items[existingIndex];
      let changed = false;

      if (!existing.isWatched) {
        const watchedTime = watchedItem.watchedAt ? new Date(watchedItem.watchedAt).getTime() : 0;
        const addedTime = existing.addedAt ? new Date(existing.addedAt).getTime() : 0;

        // Watched after being added to watchlist (with 60-second clock tolerance)
        const watchedAfterAdded =
          watchedTime > 0 && addedTime > 0 && watchedTime >= addedTime - 60000;

        let shouldMarkWatched = false;
        if (watchedAfterAdded && trackWatchlist) {
          shouldMarkWatched = true;
        } else if (!watchedAfterAdded && syncPrevious) {
          shouldMarkWatched = true;
        }

        if (shouldMarkWatched) {
          existing.isWatched = true;
          existing.watchedAt = watchedItem.watchedAt || new Date().toISOString();
          changed = true;
          newlyMarked++;
        }
      }

      if (!existing.year && watchedItem.year) {
        existing.year = watchedItem.year;
        changed = true;
      }
      if (!existing.imdbRating && watchedItem.imdbRating) {
        existing.imdbRating = watchedItem.imdbRating;
        changed = true;
      }
      if (changed) {
        itemsToUpsert.push(existing);
      }
    } else if (syncPrevious) {
      // Movie was NOT in the user's watchlist: only sync if syncPreviouslyWatched is true
      const newItem = normalizeItem(
        {
          ...watchedItem,
          id: cleanId,
          isWatched: true,
        },
        bucket.id
      );
      bucket.items.push(newItem);
      itemsToUpsert.push(newItem);
      newlyAdded++;
    }
  }

  if (itemsToUpsert.length > 0) {
    await supabaseUpsertItems(itemsToUpsert, bucket.id);
  }

  return {
    count: itemsToUpsert.length,
    newlyMarked,
    newlyAdded,
    totalWatched: bucket.items.filter((i) => i.isWatched).length,
    stats: getStats(bucket.id),
  };
}

module.exports = {
  getItems,
  getEnrichedItems,
  getUserQualityCriteria,
  getAllUsersItems,
  getItem,
  addItem,
  updateItem,
  removeItem,
  setWatched,
  getStats,
  syncWatchedWithStremio,
};
