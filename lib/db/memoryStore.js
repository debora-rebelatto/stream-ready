const crypto = require('crypto');
const { DEFAULT_NOTIFICATION_SETTINGS } = require('./notificationSettingsHelper');

const DEFAULT_SETTINGS = {
  stremioAuthKey: null,
  minQuality: '1080p', // '1080p' or '4k'
  minAudio: 'any', // 'any' | 'surround' | 'atmos'
  autoSyncWatched: false, // Background auto-sync disabled by default
  trackWatchlistWatched: true, // Track watchlist movies watched after addition (enabled by default)
  syncPreviouslyWatched: false, // Sync previously watched Stremio movies (disabled by default)
  onboardingCompleted: false, // Whether first-login setup wizard was completed
  ...DEFAULT_NOTIFICATION_SETTINGS,
};

function getExcludedTrackingUserIds() {
  const raw =
    process.env.EXCLUDED_TRACKING_USER_IDS || process.env.VITE_EXCLUDED_TRACKING_USER_IDS || '';
  return new Set(
    raw
      .split(',')
      .map((id) => normalizeKey(id))
      .filter(Boolean)
  );
}

function isExcludedTrackingUserId(userId) {
  if (!userId) return false;
  return getExcludedTrackingUserIds().has(normalizeKey(String(userId)));
}

let memoryCache = null;

const syncState = {
  supabaseLoaded: false,
  lastSupabaseSync: 0,
  initPromise: null,
};

function normalizeKey(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase();
}

function isUserAdmin(bucketOrUser) {
  if (!bucketOrUser) return false;
  // 1. Column in Supabase table watchlist_users
  if (bucketOrUser.is_admin === true || bucketOrUser.isAdmin === true) {
    return true;
  }

  // 2. Private environment variable (outside of Git)
  const email = bucketOrUser.email ? normalizeKey(bucketOrUser.email) : '';
  const adminEnv = (process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => normalizeKey(e))
    .filter(Boolean);

  if (email && adminEnv.includes(email)) {
    return true;
  }

  return false;
}

function initMemoryCache() {
  if (!memoryCache) {
    memoryCache = {
      usersById: {}, // uuid -> userBucket
      usersByEmail: {}, // email -> userBucket
      users: {}, // key (uuid or email) -> userBucket
      authKeyMap: {}, // authKey -> userBucket
    };
  }
  return memoryCache;
}

function findUserBucket(identifier) {
  if (!identifier) return null;
  const cache = initMemoryCache();
  const key = normalizeKey(String(identifier));
  return cache.usersById[key] || cache.usersByEmail[key] || cache.users[key] || null;
}

function ensureUserBucket(identifier, emailFallback = '') {
  const cache = initMemoryCache();
  let bucket = findUserBucket(identifier);
  if (bucket) {
    if (!bucket.id) {
      bucket.id = crypto.randomUUID ? crypto.randomUUID() : 'usr_' + Date.now();
      cache.usersById[bucket.id] = bucket;
      cache.users[bucket.id] = bucket;
    }
    return bucket;
  }

  const key = normalizeKey(String(identifier));
  const isEmail = key.includes('@');
  const email = isEmail ? key : normalizeKey(emailFallback);
  const id =
    !isEmail && key
      ? key
      : crypto.randomUUID
        ? crypto.randomUUID()
        : 'usr_' + Date.now() + Math.random().toString(36).substring(2, 7);

  bucket = {
    id,
    email,
    isAdmin: false,
    createdAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    items: [],
    customLists: [],
  };

  if (id) {
    cache.usersById[id] = bucket;
    cache.users[id] = bucket;
  }
  if (email) {
    cache.usersByEmail[email] = bucket;
    cache.users[email] = bucket;
  }

  return bucket;
}

module.exports = {
  DEFAULT_SETTINGS,
  getExcludedTrackingUserIds,
  isExcludedTrackingUserId,
  syncState,
  normalizeKey,
  isUserAdmin,
  initMemoryCache,
  findUserBucket,
  ensureUserBucket,
};
