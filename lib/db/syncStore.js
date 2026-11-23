const { encryptText, decryptText } = require('../crypto');
const {
  SUPABASE_URL,
  DB_CACHE_TTL_MS,
  isSupabaseConfigured,
  getSupabaseHeaders,
  fetchAllSupabaseRows,
} = require('./supabaseClient');
const {
  DEFAULT_SETTINGS,
  syncState,
  normalizeKey,
  isUserAdmin,
  initMemoryCache,
  findUserBucket,
} = require('./memoryStore');
const { cleanImdbId, rowToItem, itemToRow } = require('./itemMapper');
const {
  mapNotificationSettingsToRow,
  mapRowToNotificationSettings,
} = require('./notificationSettingsHelper');

async function supabaseSaveUser(bucket) {
  if (!isSupabaseConfigured() || !bucket) return false;
  if (!bucket.email && bucket.id) {
    const cached = findUserBucket(bucket.id);
    if (cached && cached.email) bucket.email = cached.email;
  }
  if (!bucket.email) return false;
  try {
    const rawKey = bucket.settings?.stremioAuthKey;
    const encryptedKey = rawKey ? encryptText(rawKey) : null;

    const row = {
      email: bucket.email,
      stremio_auth_key: encryptedKey,
      min_quality: bucket.settings?.minQuality || '1080p',
      min_audio: bucket.settings?.minAudio || 'any',
      auto_sync_watched: Boolean(bucket.settings?.autoSyncWatched),
      track_watchlist_watched: bucket.settings?.trackWatchlistWatched !== false,
      sync_previously_watched: Boolean(bucket.settings?.syncPreviouslyWatched),
      onboarding_completed: Boolean(bucket.settings?.onboardingCompleted),
      ...mapNotificationSettingsToRow(bucket.settings, encryptText),
      updated_at: new Date().toISOString(),
    };
    if (bucket.id) {
      row.id = bucket.id;
    }

    let res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_users?on_conflict=email`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify([row]),
    });

    if (!res.ok && res.status === 400) {
      const legacyRow = { ...row };
      delete legacyRow.notifications_enabled;
      delete legacyRow.discord_webhook_url;
      delete legacyRow.discord_notifications_enabled;
      delete legacyRow.telegram_chat_id;
      delete legacyRow.telegram_notifications_enabled;
      delete legacyRow.email_notifications_enabled;
      delete legacyRow.notification_email;
      res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_users?on_conflict=email`, {
        method: 'POST',
        headers: getSupabaseHeaders({
          Prefer: 'resolution=merge-duplicates,return=representation',
        }),
        body: JSON.stringify([legacyRow]),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }

    const savedRows = await res.json();
    if (Array.isArray(savedRows) && savedRows[0] && savedRows[0].id) {
      const assignedId = savedRows[0].id;
      bucket.id = assignedId;
      const cache = initMemoryCache();
      cache.usersById[assignedId] = bucket;
      cache.users[assignedId] = bucket;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Error saving user to database:', err.message);
    return false;
  }
}

async function supabaseUpsertItems(items, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (
    !isSupabaseConfigured() ||
    !bucket ||
    !bucket.id ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return false;
  }
  try {
    const rows = items.map((item) => itemToRow(item, bucket.id));
    let res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?on_conflict=user_id,imdb_id`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(rows),
    });
    if (!res.ok && res.status === 400) {
      const legacyRows = rows.map(({ notified_at: _notifiedAt, ...rest }) => rest);
      res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?on_conflict=user_id,imdb_id`, {
        method: 'POST',
        headers: getSupabaseHeaders({
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(legacyRows),
      });
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Error saving item(s):', err.message);
    return false;
  }
}

async function supabaseDeleteItem(imdbId, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  const cleanId = cleanImdbId(imdbId);
  if (!isSupabaseConfigured() || !bucket || !bucket.id || !cleanId) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist_items?user_id=eq.${encodeURIComponent(bucket.id)}&imdb_id=eq.${encodeURIComponent(cleanId)}`,
      {
        method: 'DELETE',
        headers: getSupabaseHeaders({
          Prefer: 'return=minimal',
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Error deleting item:', err.message);
    return false;
  }
}

/**
 * Syncs users, custom lists, and watchlist items from Supabase into the in-memory cache.
 */
async function syncFromSupabase(force = false) {
  const cache = initMemoryCache();
  if (!isSupabaseConfigured()) {
    return cache;
  }

  const now = Date.now();
  if (!force && syncState.supabaseLoaded && now - syncState.lastSupabaseSync < DB_CACHE_TTL_MS) {
    return cache;
  }

  try {
    let [uRows, listsRows, iRows] = await Promise.all([
      fetchAllSupabaseRows(
        'watchlist_users?select=id,email,is_admin,stremio_auth_key,min_quality,min_audio,auto_sync_watched,track_watchlist_watched,sync_previously_watched,onboarding_completed,notifications_enabled,discord_webhook_url,discord_notifications_enabled,telegram_chat_id,telegram_notifications_enabled,email_notifications_enabled,notification_email'
      ),
      fetchAllSupabaseRows(
        'watchlist_custom_lists?select=id,user_id,name,emoji,created_at,updated_at&order=created_at.asc'
      ),
      fetchAllSupabaseRows(
        'watchlist_items?select=id,user_id,imdb_id,name,year,poster,added_at,has_1080p_plus,best_quality,has_atmos,audio_format,stream_count,last_checked,ready_at,notified_at,is_watched,watched_at,custom_lists&order=added_at.desc'
      ),
    ]);

    if (uRows === null) {
      console.warn(
        '[Supabase] Notification columns not found on watchlist_users; falling back to legacy select. Run supabase_schema.sql migration to enable DB persistence for notifications.'
      );
      uRows = await fetchAllSupabaseRows(
        'watchlist_users?select=id,email,is_admin,stremio_auth_key,min_quality,min_audio,auto_sync_watched,track_watchlist_watched,sync_previously_watched,onboarding_completed'
      );
    }
    if (iRows === null) {
      iRows = await fetchAllSupabaseRows(
        'watchlist_items?select=id,user_id,imdb_id,name,year,poster,added_at,has_1080p_plus,best_quality,has_atmos,audio_format,stream_count,last_checked,ready_at,is_watched,watched_at,custom_lists&order=added_at.desc'
      );
    }

    const newUsersById = {};
    const newUsersByEmail = {};
    const newUsers = {};
    const newAuthKeyMap = {};

    if (Array.isArray(uRows)) {
      for (const u of uRows) {
        const userUuid = u.id;
        const email = normalizeKey(u.email);
        if (!userUuid || !email) continue;
        const decryptedKey = u.stremio_auth_key ? decryptText(u.stremio_auth_key) : null;
        const bucket = {
          id: userUuid,
          email,
          isAdmin: isUserAdmin(u),
          settings: {
            stremioAuthKey: decryptedKey,
            minQuality: u.min_quality || '1080p',
            minAudio: u.min_audio || 'any',
            autoSyncWatched: Boolean(u.auto_sync_watched),
            trackWatchlistWatched: u.track_watchlist_watched !== false,
            syncPreviouslyWatched: Boolean(u.sync_previously_watched),
            onboardingCompleted: Boolean(u.onboarding_completed),
            ...mapRowToNotificationSettings(u, decryptText),
          },
          items: [],
          customLists: [],
        };
        newUsersById[userUuid] = bucket;
        newUsersByEmail[email] = bucket;
        newUsers[userUuid] = bucket;
        newUsers[email] = bucket;
        if (decryptedKey) {
          newAuthKeyMap[decryptedKey] = bucket;
        }
      }
    }

    if (Array.isArray(listsRows)) {
      for (const l of listsRows) {
        const userUuid = l.user_id;
        const bucket =
          newUsersById[userUuid] || newUsersByEmail[normalizeKey(userUuid)] || newUsers[userUuid];
        if (bucket) {
          bucket.customLists.push({
            id: l.id,
            userId: l.user_id,
            name: l.name,
            emoji: l.emoji || '',
            createdAt: l.created_at,
            updatedAt: l.updated_at,
          });
        }
      }
    }

    if (Array.isArray(iRows)) {
      for (const row of iRows) {
        const item = rowToItem(row);
        const userUuid = row.user_id;
        let bucket =
          newUsersById[userUuid] || newUsersByEmail[normalizeKey(userUuid)] || newUsers[userUuid];
        if (!bucket && userUuid) {
          const isEmail = String(userUuid).includes('@');
          bucket = {
            id: userUuid,
            email: isEmail ? normalizeKey(userUuid) : '',
            isAdmin: false,
            settings: { ...DEFAULT_SETTINGS },
            items: [],
            customLists: [],
          };
          newUsersById[userUuid] = bucket;
          newUsers[userUuid] = bucket;
          if (isEmail) newUsersByEmail[bucket.email] = bucket;
        }
        if (bucket) {
          if (!bucket.items.some((i) => i.id === item.id)) {
            bucket.items.push(item);
          }
        }
      }
    }

    cache.usersById = newUsersById;
    cache.usersByEmail = newUsersByEmail;
    cache.users = newUsers;
    cache.authKeyMap = newAuthKeyMap;
    syncState.supabaseLoaded = true;
    syncState.lastSupabaseSync = Date.now();
    return cache;
  } catch (err) {
    console.error('[Supabase] Connection failure during sync:', err.message);
    return cache;
  }
}

async function ensureLoaded(force = false) {
  if (!isSupabaseConfigured()) {
    return initMemoryCache();
  }
  if (
    !syncState.initPromise ||
    force ||
    Date.now() - syncState.lastSupabaseSync > DB_CACHE_TTL_MS
  ) {
    syncState.initPromise = syncFromSupabase(force).finally(() => {
      syncState.initPromise = null;
    });
  }
  return syncState.initPromise;
}

module.exports = {
  supabaseSaveUser,
  supabaseUpsertItems,
  supabaseDeleteItem,
  syncFromSupabase,
  ensureLoaded,
};
