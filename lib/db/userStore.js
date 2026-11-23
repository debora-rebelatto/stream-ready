const { SUPABASE_URL, isSupabaseConfigured, getSupabaseHeaders } = require('./supabaseClient');
const {
  DEFAULT_SETTINGS,
  normalizeKey,
  isUserAdmin,
  initMemoryCache,
  findUserBucket,
  ensureUserBucket,
} = require('./memoryStore');
const { ensureLoaded, supabaseSaveUser } = require('./syncStore');
const {
  formatPublicNotificationSettings,
  sanitizeNotificationSettingsPatch,
} = require('./notificationSettingsHelper');

/**
 * Resolves an identifier (UUID, email, or Stremio authKey) to a user object.
 * Creates the user with a unique UUID in the database if not yet registered.
 */
async function resolveUser(identifier, getUserInfoFn) {
  if (!identifier || typeof identifier !== 'string') return null;
  await ensureLoaded();
  const cache = initMemoryCache();

  // 1. Check if identifier is already a userId (UUID) or email
  const directBucket = findUserBucket(identifier);
  if (directBucket && directBucket.id) {
    if (isUserAdmin(directBucket)) directBucket.isAdmin = true;
    const hasItems = Array.isArray(directBucket.items) && directBucket.items.length > 0;
    return {
      id: directBucket.id,
      email: directBucket.email,
      isAdmin: Boolean(directBucket.isAdmin),
      onboardingCompleted: Boolean(directBucket.settings?.onboardingCompleted || hasItems),
    };
  }

  // 2. Check if authKey is in cache map
  const cachedBucket = cache.authKeyMap[identifier];
  if (cachedBucket && cachedBucket.id) {
    if (isUserAdmin(cachedBucket)) cachedBucket.isAdmin = true;
    const hasItems = Array.isArray(cachedBucket.items) && cachedBucket.items.length > 0;
    return {
      id: cachedBucket.id,
      email: cachedBucket.email,
      isAdmin: Boolean(cachedBucket.isAdmin),
      onboardingCompleted: Boolean(cachedBucket.settings?.onboardingCompleted || hasItems),
    };
  }

  // 3. If it's a Stremio authKey, resolve via Stremio API
  if (typeof getUserInfoFn === 'function') {
    const stremioUser = await getUserInfoFn(identifier);
    if (stremioUser && stremioUser.email) {
      const email = normalizeKey(stremioUser.email);
      let bucket = cache.usersByEmail[email];
      if (!bucket) {
        bucket = ensureUserBucket(email);
      }
      bucket.settings.stremioAuthKey = identifier;
      if (isUserAdmin(bucket)) bucket.isAdmin = true;
      await supabaseSaveUser(bucket);
      cache.authKeyMap[identifier] = bucket;
      const hasItems = Array.isArray(bucket.items) && bucket.items.length > 0;
      return {
        id: bucket.id,
        email: bucket.email,
        isAdmin: Boolean(bucket.isAdmin),
        onboardingCompleted: Boolean(bucket.settings?.onboardingCompleted || hasItems),
      };
    }
  }
  return null;
}

async function resolveUserId(authKey, getUserInfoFn) {
  const u = await resolveUser(authKey, getUserInfoFn);
  return u ? u.id : null;
}

function getAllUsers() {
  const cache = initMemoryCache();
  const users = [];
  const processed = new Set();
  for (const bucket of Object.values(cache.usersById)) {
    if (!bucket || !bucket.id || processed.has(bucket.id)) continue;
    processed.add(bucket.id);
    users.push({
      id: bucket.id,
      email: bucket.email,
      isAdmin: Boolean(bucket.isAdmin),
      createdAt: bucket.createdAt || null,
      authKey: bucket.settings?.stremioAuthKey || null,
      settings: bucket.settings || {},
      customLists: bucket.customLists || [],
      itemsCount: (bucket.items || []).length,
    });
  }
  return users;
}

function getSettings(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket) return { ...DEFAULT_SETTINGS, ...formatPublicNotificationSettings(DEFAULT_SETTINGS) };
  const hasItems = Array.isArray(bucket.items) && bucket.items.length > 0;
  return {
    ...DEFAULT_SETTINGS,
    ...(bucket.settings || {}),
    stremioAuthKey: bucket.settings?.stremioAuthKey ? '********' : null,
    minQuality: bucket.settings?.minQuality || '1080p',
    minAudio: bucket.settings?.minAudio || 'any',
    autoSyncWatched: Boolean(bucket.settings?.autoSyncWatched),
    trackWatchlistWatched: bucket.settings?.trackWatchlistWatched !== false,
    syncPreviouslyWatched: Boolean(bucket.settings?.syncPreviouslyWatched),
    onboardingCompleted: Boolean(bucket.settings?.onboardingCompleted || hasItems),
    ...formatPublicNotificationSettings(bucket.settings),
  };
}

function getRawNotificationSettings(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket) return null;
  const s = bucket.settings || {};
  return {
    userId: bucket.id,
    email: bucket.email || null,
    notificationsEnabled: Boolean(s.notificationsEnabled),
    discordNotificationsEnabled: Boolean(s.discordNotificationsEnabled),
    discordWebhookUrl: s.discordWebhookUrl || null,
    telegramNotificationsEnabled: Boolean(s.telegramNotificationsEnabled),
    telegramChatId: s.telegramChatId ? String(s.telegramChatId) : null,
    emailNotificationsEnabled: Boolean(s.emailNotificationsEnabled),
    notificationEmail: s.notificationEmail ? String(s.notificationEmail) : null,
  };
}

async function updateSettings(newSettings, userIdentifier) {
  await ensureLoaded();
  const cache = initMemoryCache();
  let bucket = findUserBucket(userIdentifier);
  if (!bucket) {
    bucket = ensureUserBucket(userIdentifier);
  }

  const safeSettings = { ...newSettings };
  delete safeSettings.id;
  if (safeSettings.stremioAuthKey === '********' || safeSettings.stremioAuthKey === undefined) {
    delete safeSettings.stremioAuthKey;
  }
  if (safeSettings.minAudio !== undefined) {
    const validAudio = ['any', 'surround', 'atmos'];
    safeSettings.minAudio = validAudio.includes(safeSettings.minAudio)
      ? safeSettings.minAudio
      : 'any';
  }
  if (safeSettings.autoSyncWatched !== undefined) {
    safeSettings.autoSyncWatched = Boolean(safeSettings.autoSyncWatched);
  }
  if (safeSettings.trackWatchlistWatched !== undefined) {
    safeSettings.trackWatchlistWatched = Boolean(safeSettings.trackWatchlistWatched);
  }
  if (safeSettings.syncPreviouslyWatched !== undefined) {
    safeSettings.syncPreviouslyWatched = Boolean(safeSettings.syncPreviouslyWatched);
  }
  if (safeSettings.onboardingCompleted !== undefined) {
    safeSettings.onboardingCompleted = Boolean(safeSettings.onboardingCompleted);
  }

  // Sanitize notification fields (preserves existing webhook if masked placeholder is sent)
  delete safeSettings.hasDiscordWebhook;
  const notifPatch = sanitizeNotificationSettingsPatch(safeSettings);
  delete safeSettings.discordWebhookUrl;
  Object.assign(safeSettings, notifPatch);

  bucket.settings = { ...DEFAULT_SETTINGS, ...bucket.settings, ...safeSettings };
  if (bucket.settings.stremioAuthKey) {
    cache.authKeyMap[bucket.settings.stremioAuthKey] = bucket;
  }

  await supabaseSaveUser(bucket);
  return getSettings(bucket.id || userIdentifier);
}

/**
 * Completely deletes a user and bulldozes all associated data from Supabase and memory cache.
 */
async function deleteUser(userIdentifier) {
  if (!userIdentifier) return { success: false, error: 'User identifier required' };

  let bucket = findUserBucket(userIdentifier);
  let userId = bucket ? bucket.id : null;
  let userEmail = bucket ? bucket.email : null;

  const cache = initMemoryCache();
  for (const b of [
    ...Object.values(cache.usersById),
    ...Object.values(cache.usersByEmail),
    ...Object.values(cache.users),
  ]) {
    if (!b) continue;
    if (
      b.id === userIdentifier ||
      b.email === userIdentifier ||
      normalizeKey(b.email || '') === normalizeKey(userIdentifier)
    ) {
      bucket = bucket || b;
      userId = userId || b.id;
      userEmail = userEmail || b.email;
    }
  }

  if (isSupabaseConfigured()) {
    // If not found in memory bucket, try to query user from Supabase
    if (!userId || !userEmail) {
      try {
        const queryVal = String(userIdentifier).trim();
        const checkRes = await fetch(
          `${SUPABASE_URL}/rest/v1/watchlist_users?select=id,email&or=(id.eq.${encodeURIComponent(queryVal)},email.eq.${encodeURIComponent(queryVal.toLowerCase())})`,
          { headers: getSupabaseHeaders() }
        );
        if (checkRes.ok) {
          const rows = await checkRes.json();
          if (Array.isArray(rows) && rows[0]) {
            userId = rows[0].id || userId;
            userEmail = rows[0].email || userEmail;
          }
        }
      } catch (err) {
        console.error('[Supabase] Error finding user before delete:', err.message);
      }
    }

    const deletePromises = [];
    const minimalHeaders = getSupabaseHeaders({ Prefer: 'return=minimal' });

    if (userId) {
      const encodedId = encodeURIComponent(userId);
      const childTables = [
        ['watchlist_custom_lists', 'user_id', 'user custom lists'],
        ['watchlist_items', 'user_id', 'user watchlist items'],
        ['analytics_events', 'user_id', 'user analytics events'],
        ['poll_votes', 'user_id', 'user poll votes'],
        ['watchlist_users', 'id', 'user record by id'],
      ];

      for (const [table, column, label] of childTables) {
        deletePromises.push(
          fetch(`${SUPABASE_URL}/rest/v1/${table}?${column}=eq.${encodedId}`, {
            method: 'DELETE',
            headers: minimalHeaders,
          }).catch((err) => console.error(`[Supabase] Error deleting ${label}:`, err.message))
        );
      }
    }

    if (userEmail) {
      deletePromises.push(
        fetch(
          `${SUPABASE_URL}/rest/v1/watchlist_users?email=eq.${encodeURIComponent(normalizeKey(userEmail))}`,
          { method: 'DELETE', headers: minimalHeaders }
        ).catch((err) =>
          console.error('[Supabase] Error deleting user record by email:', err.message)
        )
      );
    }

    await Promise.all(deletePromises);
  }

  // Memory cache cleanup
  const keysToRemove = new Set(
    [
      userIdentifier,
      userId,
      userEmail,
      normalizeKey(userIdentifier),
      userEmail ? normalizeKey(userEmail) : null,
    ].filter(Boolean)
  );

  for (const map of [cache.usersById, cache.usersByEmail, cache.users]) {
    for (const [k, b] of Object.entries(map)) {
      const match =
        !b ||
        b === bucket ||
        (userId && b.id === userId) ||
        (userEmail && b.email === userEmail) ||
        (userEmail && normalizeKey(b.email || '') === normalizeKey(userEmail)) ||
        (userEmail && (k === userEmail || normalizeKey(k) === normalizeKey(userEmail))) ||
        (userId && (k === userId || normalizeKey(k) === normalizeKey(userId))) ||
        keysToRemove.has(k) ||
        keysToRemove.has(normalizeKey(k));

      if (match) {
        if (b) {
          b.id = null;
          b.email = null;
          b.items = [];
          b.customLists = [];
          b.settings = {};
        }
        delete map[k];
      }
    }
  }

  for (const [authK, b] of Object.entries(cache.authKeyMap)) {
    if (
      b &&
      (b === bucket || (userId && b.id === userId) || (userEmail && b.email === userEmail))
    ) {
      delete cache.authKeyMap[authK];
    }
  }

  if (bucket) {
    bucket.id = null;
    bucket.email = null;
    bucket.items = [];
    bucket.customLists = [];
    bucket.settings = {};
  }

  return { success: true, userId, userEmail };
}

module.exports = {
  resolveUser,
  resolveUserId,
  getAllUsers,
  getSettings,
  getRawNotificationSettings,
  updateSettings,
  deleteUser,
};
