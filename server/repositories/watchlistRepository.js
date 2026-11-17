const db = require('../../lib/db');

const watchlistRepository = {
  getItems: (userId) => db.getItems(userId),
  getAllUsersItems: () => db.getAllUsersItems(),
  getItem: (id, userId) => db.getItem(id, userId),
  addItem: (item, userId) => db.addItem(item, userId),
  updateItem: (id, patch, userId) => db.updateItem(id, patch, userId),
  removeItem: (id, userId) => db.removeItem(id, userId),
  setWatched: (id, watched, userId) => db.setWatched(id, watched, userId),
  syncWatchedWithStremio: (authKey, userId, options) =>
    db.syncWatchedWithStremio(authKey, userId, options),
  getStats: (userId) => db.getStats(userId),
  isItemReady: (item, globalMinQuality) => db.isItemReady(item, globalMinQuality),
  isItemUnreleased: (item) => db.isItemUnreleased(item),
  cleanImdbId: (rawId) => db.cleanImdbId(rawId),
  isLegitimateMovieId: (rawId) => db.isLegitimateMovieId(rawId),
};

module.exports = { watchlistRepository };
