/**
 * Builds a normalized watchlist item patch from a qualityCheckerService result.
 * Single source of truth used across addItem, recheckSingle, recheckAll, import, and background sync.
 */
function buildQualityPatch(quality, options = {}) {
  const patch = {
    has1080pPlus: Boolean(quality?.has1080pPlus),
    bestQuality: quality?.bestQuality || 'Pending',
    hasAtmos: Boolean(quality?.hasAtmos),
    audioFormat: quality?.audioFormat || '',
    streamCount: Number(quality?.streamCount || 0),
  };

  if (options.includeLastChecked !== false) {
    patch.lastChecked = quality?.checkedAt || new Date().toISOString();
  }
  if (options.includeExtended) {
    patch.count1080pPlus = Number(quality?.count1080pPlus || 0);
    patch.checkError = quality?.error || null;
  }

  return patch;
}

module.exports = {
  buildQualityPatch,
};
