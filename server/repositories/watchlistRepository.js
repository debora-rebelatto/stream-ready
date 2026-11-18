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
  getTopMovies: (limit = 10) => {
    const allUserItems = db.getAllUsersItems();
    const movieMap = new Map();
    for (const entry of allUserItems) {
      const it = entry.item;
      if (!it || !it.id) continue;
      const movieId = db.cleanImdbId(it.id);
      if (!movieId) continue;

      const existing = movieMap.get(movieId) || {
        id: movieId,
        name: it.name || it.title || 'Unknown Title',
        year: it.year,
        userCount: 0,
        readyCount: 0,
        poster: it.poster,
      };

      existing.userCount++;
      const isReady = db.isItemReady ? db.isItemReady(it) : Boolean(it.has1080pPlus || it.isReady);
      if (isReady) existing.readyCount++;
      if (!existing.poster && it.poster) existing.poster = it.poster;
      if (it.bestQuality && (!existing.bestQuality || existing.bestQuality === 'Pending' || existing.bestQuality === 'Watched')) {
        existing.bestQuality = it.bestQuality;
      }

      movieMap.set(movieId, existing);
    }

    return Array.from(movieMap.values())
      .sort((a, b) => b.userCount - a.userCount)
      .slice(0, limit);
  },
};

module.exports = { watchlistRepository };
