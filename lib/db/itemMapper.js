const {
  formatQualityLabel,
  resolveQualityTier,
  isSurroundAudioFormat,
  isLosslessAudioFormat,
  isItemReady,
  isItemNewRelease,
  isItemUnreleased,
  resolveMovieStatus,
  computeMovieStatus,
  enrichWatchlistItem,
  computeWatchlistStats,
} = require('./qualityEvaluator');

function cleanImdbId(rawId) {
  if (!rawId) return '';
  const str = String(rawId).trim();
  if (str.toLowerCase().startsWith('tmdb:')) return str;
  return str.includes(':') ? str.split(':').pop() : str;
}

/**
 * Validates whether an ID belongs to a legitimate movie (IMDb 'tt...' or TMDB 'tmdb:...').
 * Ignores third-party utility IDs (e.g. 'dlrealdebrid', 'delete_all', etc.).
 */
function isLegitimateMovieId(rawId) {
  if (!rawId) return false;
  const str = String(rawId).trim().toLowerCase();
  return /^tt\d+$/.test(str) || /^tmdb:\d+$/.test(str);
}

/**
 * Converts a Postgres snake_case row into a camelCase application movie object.
 */
function rowToItem(row) {
  const imdbId = row.imdb_id;
  const has1080pPlus = Boolean(row.has_1080p_plus);
  const hasAtmos = Boolean(row.has_atmos);
  const audioFormat = row.audio_format || (hasAtmos ? 'Dolby Atmos' : '');
  return {
    id: imdbId,
    rowId: row.id,
    userId: row.user_id,
    type: 'movie',
    name: row.name || imdbId,
    year: row.year || '',
    poster: row.poster || '',
    imdbRating: row.imdb_rating || row.imdbRating || '',
    addedAt: row.added_at || new Date().toISOString(),
    has1080pPlus,
    bestQuality: row.best_quality || 'Pending',
    hasAtmos,
    hasSurround: isSurroundAudioFormat(audioFormat, hasAtmos),
    isLosslessAudio: isLosslessAudioFormat(audioFormat),
    audioFormat,
    streamCount: Number(row.stream_count || 0),
    lastChecked: row.last_checked || null,
    readyAt: row.ready_at || (has1080pPlus ? row.last_checked || row.added_at : null),
    isWatched: Boolean(row.is_watched),
    watchedAt: row.watched_at || null,
    customLists: Array.isArray(row.custom_lists) ? row.custom_lists : [],
  };
}

/**
 * Converts an application movie object into a Postgres relational row.
 */
function itemToRow(item, userUuid) {
  const imdbId = cleanImdbId(item.id || item.imdbId);
  const has1080pPlus = Boolean(item.has1080pPlus);
  const hasAtmos = Boolean(item.hasAtmos);
  return {
    user_id: userUuid,
    imdb_id: imdbId,
    name: item.name || imdbId,
    year: item.year ? String(item.year) : '',
    poster: item.poster || '',
    added_at: item.addedAt || new Date().toISOString(),
    has_1080p_plus: has1080pPlus,
    best_quality: item.bestQuality || 'Pending',
    has_atmos: hasAtmos,
    audio_format: item.audioFormat || (hasAtmos ? 'Dolby Atmos' : ''),
    stream_count: Number(item.streamCount || 0),
    last_checked: item.lastChecked || null,
    ready_at: has1080pPlus ? item.readyAt || new Date().toISOString() : null,
    is_watched: Boolean(item.isWatched),
    watched_at: item.watchedAt || null,
    custom_lists: Array.isArray(item.customLists) ? item.customLists : [],
  };
}

function normalizeItem(item, userUuid) {
  const imdbId = cleanImdbId(item.id);
  const has1080pPlus = Boolean(item.has1080pPlus);
  const hasAtmos = Boolean(item.hasAtmos || item.has_atmos);
  const audioFormat = item.audioFormat || item.audio_format || (hasAtmos ? 'Dolby Atmos' : '');
  const readyAt = has1080pPlus ? item.readyAt || new Date().toISOString() : null;
  return {
    id: imdbId,
    userId: userUuid || item.userId || '',
    type: 'movie',
    name: item.name || imdbId,
    year: item.year || '',
    poster: item.poster || '',
    imdbRating: item.imdbRating
      ? String(item.imdbRating)
      : item.imdb_rating
        ? String(item.imdb_rating)
        : '',
    addedAt: item.addedAt || new Date().toISOString(),
    has1080pPlus,
    bestQuality: item.bestQuality || 'Pending',
    hasAtmos,
    hasSurround:
      typeof item.hasSurround === 'boolean'
        ? item.hasSurround
        : isSurroundAudioFormat(audioFormat, hasAtmos),
    isLosslessAudio:
      typeof item.isLosslessAudio === 'boolean'
        ? item.isLosslessAudio
        : isLosslessAudioFormat(audioFormat),
    audioFormat,
    streamCount: Number(item.streamCount || 0),
    lastChecked: item.lastChecked || null,
    readyAt,
    isWatched: Boolean(item.isWatched),
    watchedAt: item.watchedAt || null,
    customLists: Array.isArray(item.customLists)
      ? item.customLists
      : Array.isArray(item.custom_lists)
        ? item.custom_lists
        : [],
  };
}

module.exports = {
  cleanImdbId,
  isLegitimateMovieId,
  formatQualityLabel,
  resolveQualityTier,
  isSurroundAudioFormat,
  isLosslessAudioFormat,
  isItemReady,
  isItemNewRelease,
  isItemUnreleased,
  resolveMovieStatus,
  computeMovieStatus,
  enrichWatchlistItem,
  computeWatchlistStats,
  rowToItem,
  itemToRow,
  normalizeItem,
};
