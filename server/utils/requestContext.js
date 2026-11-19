const db = require('../../lib/db');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { getManifest } = require('../../lib/stremioAddon');
const { getUserInfo, saveAccountWatchlist } = require('../../lib/stremioAuth');
const { decodeUserData } = require('../../lib/userData');

const PORT = process.env.PORT || 7000;
const userSyncThrottle = new Map();
let backgroundCheckRunning = false;

function getBaseUrl(req) {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol =
    req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

function getRequestAuthKey(req) {
  const headerKey = req.headers['x-stremio-auth'];
  if (headerKey) return headerKey;
  if (req.params && req.params.authKey) return req.params.authKey;
  if (req.body && req.body.authKey) return req.body.authKey;
  if (req.query && req.query.authKey) return req.query.authKey;
  return null;
}

async function getRequestUser(req) {
  const rawKey = getRequestAuthKey(req);
  if (!rawKey) {
    return {
      authKey: null,
      userId: null,
      userEmail: null,
      user: null,
      userData: { authKey: '', items: [], ids: [] },
    };
  }
  const userData = decodeUserData(rawKey);
  const effectiveAuthKey = userData.authKey || rawKey;
  const user = await db.resolveUser(effectiveAuthKey, getUserInfo);
  const userId = user ? user.id : null;
  const userEmail = user ? user.email : null;
  return { authKey: effectiveAuthKey, userId, userEmail, user, userData };
}

async function syncAddonUrlWithAccount(authKey, baseUrl, userId) {
  if (!authKey || !userId) return;
  try {
    const items = db.getItems(userId);
    const manifest = getManifest(baseUrl, userId);
    await saveAccountWatchlist(authKey, baseUrl, items, manifest);
  } catch (err) {
    console.warn('[AddonSync] Warning syncing addon URL:', err.message);
  }
}

function triggerUserOnDemandSync(authKey, userId) {
  if (!authKey || !userId) return;
  const now = Date.now();
  const lastSync = userSyncThrottle.get(userId) || 0;
  if (now - lastSync < 10 * 60 * 1000) return;
  userSyncThrottle.set(userId, now);

  (async () => {
    try {
      const userSettings = db.getSettings(userId);
      if (userSettings && (userSettings.autoSyncWatched || userSettings.trackWatchlistWatched)) {
        await db.syncWatchedWithStremio(authKey, userId);
      }

      const pendingItems = db.getItems(userId).filter((i) => !i.has1080pPlus && !i.isWatched);
      for (const item of pendingItems.slice(0, 5)) {
        const q = await checkMovieQuality(item.id, item.type || 'movie', item.name, item.year);
        if (q && q.has1080pPlus) {
          await db.updateItem(
            item.id,
            {
              has1080pPlus: q.has1080pPlus,
              bestQuality: q.bestQuality,
              streamCount: q.streamCount,
              lastChecked: q.checkedAt,
            },
            userId
          );
        }
        await new Promise((r) => setTimeout(r, 600));
      }
    } catch (err) {
      console.warn(`[OnDemandSync:${userId}] Check error:`, err.message);
    }
  })();
}

async function runBackgroundCheck() {
  if (backgroundCheckRunning) {
    return { skipped: true, reason: 'already_running' };
  }
  backgroundCheckRunning = true;

  const summary = {
    syncedUsersCount: 0,
    totalPendingItems: 0,
    uniqueCheckedCount: 0,
    newlyReadyCount: 0,
  };

  try {
    await db.ensureLoaded();

    const users = db
      .getAllUsers()
      .filter((u) => Boolean(u.authKey) && Boolean(u.settings?.autoSyncWatched));
    if (users.length > 0) {
      console.log(
        `[AutoChecker] Syncing watched history from Stremio for ${users.length} user(s) with autoSync enabled...`
      );
      for (const u of users) {
        try {
          const syncRes = await db.syncWatchedWithStremio(u.authKey, u.id);
          summary.syncedUsersCount++;
          if (syncRes.count > 0) {
            console.log(`[AutoChecker:${u.email}] Synced ${syncRes.count} watched movie(s).`);
          }
        } catch (syncErr) {
          console.warn(`[AutoChecker] Error syncing watched for ${u.email}:`, syncErr.message);
        }
      }
    }

    const allPending = db
      .getAllUsersItems()
      .filter((entry) => !entry.item.has1080pPlus && !entry.item.isWatched);
    summary.totalPendingItems = allPending.length;

    if (allPending.length > 0) {
      // Group pending items by movie ID so each unique movie is checked once per run
      const groupedByMovieId = new Map();
      for (const entry of allPending) {
        const movieId = entry.item.id;
        if (!movieId) continue;
        if (!groupedByMovieId.has(movieId)) {
          groupedByMovieId.set(movieId, {
            sampleItem: entry.item,
            entries: [],
            oldestCheckMs: entry.item.lastChecked
              ? new Date(entry.item.lastChecked).getTime() || 0
              : 0,
          });
        }
        groupedByMovieId.get(movieId).entries.push(entry);
      }

      // Prioritize movies that were least recently checked (or never checked)
      const uniqueMoviesBatch = Array.from(groupedByMovieId.values())
        .sort((a, b) => a.oldestCheckMs - b.oldestCheckMs)
        .slice(0, 15);

      console.log(
        `[AutoChecker] Checking ${uniqueMoviesBatch.length} unique pending movie(s) (across ${allPending.length} total watchlist entries)...`
      );

      for (const group of uniqueMoviesBatch) {
        const { sampleItem, entries } = group;
        const quality = await checkMovieQuality(
          sampleItem.id,
          sampleItem.type || 'movie',
          sampleItem.name,
          sampleItem.year
        );
        summary.uniqueCheckedCount++;

        if (quality.has1080pPlus) {
          summary.newlyReadyCount++;
        }

        for (const { userId, item } of entries) {
          if (quality.has1080pPlus) {
            console.log(
              `🎉 [NEW:${userId}] "${item.name}" is now available in ${quality.bestQuality}!`
            );
          }
          await db.updateItem(
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
        }

        await new Promise((r) => setTimeout(r, 150));
      }
    }

    return summary;
  } catch (err) {
    console.error('[AutoChecker Error]', err.message);
    return summary;
  } finally {
    backgroundCheckRunning = false;
  }
}

module.exports = {
  getBaseUrl,
  getRequestAuthKey,
  getRequestUser,
  syncAddonUrlWithAccount,
  userSyncThrottle,
  triggerUserOnDemandSync,
  runBackgroundCheck,
};
