const { isSupabaseConfigured } = require('./db/supabaseClient');
const { isUserAdmin, findUserBucket, ensureUserBucket } = require('./db/memoryStore');
const {
  isItemReady,
  isItemUnreleased,
  computeMovieStatus,
  enrichWatchlistItem,
  cleanImdbId,
  isLegitimateMovieId,
} = require('./db/itemMapper');
const { ensureLoaded, supabaseUpsertItems } = require('./db/syncStore');

module.exports = {
  isSupabaseConfigured,
  ensureLoaded,
  supabaseUpsertItems,
  isUserAdmin,
  findUser: findUserBucket,
  findUserBucket,
  ensureUserBucket,
  isItemReady,
  isItemUnreleased,
  computeMovieStatus,
  enrichWatchlistItem,
  cleanImdbId,
  isLegitimateMovieId,
  ...require('./db/userStore'),
  ...require('./db/watchlistStore'),
  ...require('./db/customListStore'),
  ...require('./db/analyticsStore'),
  ...require('./db/pollStore'),
};
