const db = require('../../lib/db');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { getManifest } = require('../../lib/stremioAddon');
const { getUserInfo, saveAccountWatchlist } = require('../../lib/stremioAuth');
const { decodeUserData } = require('../../lib/userData');
const { buildQualityPatch } = require('./qualityPatch');
const { notificationOperationService } = require('../services/notificationOperationService');

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

const ON_DEMAND_BATCH_LIMIT = 5;
const CRON_CONCURRENCY = 5;

function getLastCheckedMs(item) {
  if (!item || !item.lastChecked) return 0;
  const parsed = new Date(item.lastChecked).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function sleep(ms) {
  let timeout;
  return new Promise((resolve) => {
    timeout = setTimeout(resolve, ms);
    if (timeout && typeof timeout.unref === 'function') {
      timeout.unref();
    }
  }).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
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

      const criteria = db.getUserQualityCriteria(userId);
      const pendingItems = db
        .getItems(userId)
        .filter((i) => !db.isItemReady(i, criteria) && !i.isWatched)
        .sort((a, b) => getLastCheckedMs(a) - getLastCheckedMs(b))
        .slice(0, ON_DEMAND_BATCH_LIMIT);

      await Promise.all(
        pendingItems.map(async (item) => {
          const wasReady = db.isItemReady(item, criteria);
          const q = await checkMovieQuality(item.id, item.type || 'movie', item.name, item.year);
          if (!q || q.error) return;

          const updated = await db.updateItem(item.id, buildQualityPatch(q), userId);
          if (!wasReady && updated && db.isItemReady(updated, criteria) && !item.notifiedAt) {
            await notificationOperationService
              .notifyMovieReady({ userId, movie: updated })
              .catch((e) => console.warn(`[OnDemandSync:${userId}] Notify error:`, e.message));
          }
        })
      );
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
    notificationsSentCount: 0,
  };

  try {
    await db.ensureLoaded(true);

    // 1. Prioritize pending movie quality checks & notifications FIRST so slow watched syncs
    // can never starve or time out release detection and alert delivery.
    const allPending = db.getAllUsersItems().filter((entry) => {
      if (entry.item.isWatched) return false;
      const criteria = db.getUserQualityCriteria(entry.userId);
      return !db.isItemReady(entry.item, criteria);
    });
    summary.totalPendingItems = allPending.length;

    if (allPending.length > 0) {
      // Group pending items by movie ID so each unique movie is checked once per run
      const groupedByMovieId = new Map();
      for (const entry of allPending) {
        const movieId = entry.item.id;
        if (!movieId) continue;
        const entryCheckMs = getLastCheckedMs(entry.item);
        if (!groupedByMovieId.has(movieId)) {
          groupedByMovieId.set(movieId, {
            sampleItem: entry.item,
            entries: [],
            oldestCheckMs: entryCheckMs,
          });
        }
        const group = groupedByMovieId.get(movieId);
        if (entryCheckMs < group.oldestCheckMs) {
          group.oldestCheckMs = entryCheckMs;
        }
        group.entries.push(entry);
      }

      // Prioritize movies that were least recently checked (or never checked)
      const batchLimit = process.env.VERCEL ? 30 : 50;
      const uniqueMoviesBatch = Array.from(groupedByMovieId.values())
        .sort((a, b) => a.oldestCheckMs - b.oldestCheckMs)
        .slice(0, batchLimit);

      console.log(
        `[AutoChecker] Checking ${uniqueMoviesBatch.length} unique pending movie(s) (across ${allPending.length} total watchlist entries)...`
      );

      for (let i = 0; i < uniqueMoviesBatch.length; i += CRON_CONCURRENCY) {
        const chunk = uniqueMoviesBatch.slice(i, i + CRON_CONCURRENCY);

        await Promise.all(
          chunk.map(async (group) => {
            const { sampleItem, entries } = group;
            const quality = await checkMovieQuality(
              sampleItem.id,
              sampleItem.type || 'movie',
              sampleItem.name,
              sampleItem.year
            );
            summary.uniqueCheckedCount++;

            if (!quality || quality.error) {
              console.warn(
                `[AutoChecker] Skipping update for ${sampleItem.id} (${sampleItem.name}) due to check error:`,
                quality?.error || 'empty result'
              );
              return;
            }

            if (quality.has1080pPlus) {
              summary.newlyReadyCount++;
            }

            for (const { userId, item } of entries) {
              const criteria = db.getUserQualityCriteria(userId);
              const wasReady = db.isItemReady(item, criteria);
              const updated = await db.updateItem(
                item.id,
                buildQualityPatch(quality, { includeExtended: true }),
                userId
              );
              if (!wasReady && updated && db.isItemReady(updated, criteria) && !item.notifiedAt) {
                try {
                  const notifyRes = await notificationOperationService.notifyMovieReady({
                    userId,
                    movie: updated,
                  });
                  if (notifyRes?.sent) {
                    summary.notificationsSentCount++;
                  }
                } catch (notifyErr) {
                  console.warn(`[AutoChecker:${userId}] Notification error:`, notifyErr.message);
                }
              }
            }
          })
        );

        if (i + CRON_CONCURRENCY < uniqueMoviesBatch.length) {
          await sleep(100);
        }
      }
    }

    // 2. Sync watched history in bounded parallel chunks after quality checks complete
    const users = db
      .getAllUsers()
      .filter((u) => Boolean(u.authKey) && Boolean(u.settings?.autoSyncWatched));
    if (users.length > 0) {
      console.log(
        `[AutoChecker] Syncing watched history from Stremio for ${users.length} user(s) with autoSync enabled...`
      );
      const syncStartMs = Date.now();
      const MAX_WATCHED_SYNC_BUDGET_MS = 15000;

      for (let i = 0; i < users.length; i += CRON_CONCURRENCY) {
        if (Date.now() - syncStartMs >= MAX_WATCHED_SYNC_BUDGET_MS) {
          console.warn(
            `[AutoChecker] Watched sync budget (${MAX_WATCHED_SYNC_BUDGET_MS}ms) reached; remaining users deferred to next run.`
          );
          break;
        }
        const chunk = users.slice(i, i + CRON_CONCURRENCY);
        await Promise.all(
          chunk.map(async (u) => {
            try {
              const syncRes = await db.syncWatchedWithStremio(u.authKey, u.id);
              summary.syncedUsersCount++;
              if (syncRes.count > 0) {
                console.log(`[AutoChecker:${u.email}] Synced ${syncRes.count} watched movie(s).`);
              }
            } catch (syncErr) {
              console.warn(`[AutoChecker] Error syncing watched for ${u.email}:`, syncErr.message);
            }
          })
        );
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
