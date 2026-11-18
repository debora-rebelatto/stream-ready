const { userRepository, watchlistRepository } = require('../repositories');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { searchMovies, getMeta } = require('../../lib/cinemeta');
const { getAccountWatchlist } = require('../../lib/stremioAuth');
const tmdb = require('../../lib/tmdb');
const {
  getBaseUrl,
  getRequestUser,
  syncAddonUrlWithAccount,
  triggerUserOnDemandSync,
} = require('../utils/requestContext');

function registerWatchlistRoutes(app) {
  app.get('/api/items', async (req, res) => {
    await userRepository.ensureLoaded();
    const { authKey, userId } = await getRequestUser(req);

    if (!authKey || !userId) {
      return res.json({
        items: [],
        stats: { total: 0, ready: 0, pending: 0 },
        requireAuth: true,
      });
    }

    triggerUserOnDemandSync(authKey, userId);

    if (watchlistRepository.getItems(userId).length === 0) {
      try {
        const cloudItems = await getAccountWatchlist(authKey);
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          for (const it of cloudItems) {
            if (!watchlistRepository.getItem(it.id, userId)) {
              watchlistRepository.addItem(it, userId);
            }
          }
        }
      } catch (e) {
        console.warn('[Persistence:api/items] Cloud restore error:', e.message);
      }
    }

    const { filter, tab, listId } = req.query;
    const effectiveFilter = tab || filter;
    let items = watchlistRepository.getItems(userId);
    const userSettings = userRepository.getSettings(userId);
    const globalMinQuality = userSettings.minQuality || '1080p';

    if (listId) {
      items = items.filter((i) => Array.isArray(i.customLists) && i.customLists.includes(listId));
    }

    if (effectiveFilter === 'watched') {
      items = items.filter((i) => Boolean(i.isWatched));
    } else if (effectiveFilter === 'ready') {
      items = items.filter(
        (i) => !i.isWatched && watchlistRepository.isItemReady(i, globalMinQuality)
      );
    } else if (effectiveFilter === 'pending') {
      items = items.filter(
        (i) =>
          !i.isWatched &&
          !watchlistRepository.isItemReady(i, globalMinQuality) &&
          !watchlistRepository.isItemUnreleased(i)
      );
    } else if (effectiveFilter === 'unreleased') {
      items = items.filter((i) => !i.isWatched && watchlistRepository.isItemUnreleased(i));
    } else if (effectiveFilter === 'unwatched') {
      items = items.filter((i) => !i.isWatched);
    }

    res.json({
      items,
      stats: watchlistRepository.getStats(userId),
      requireAuth: false,
    });
  });

  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q || '';
      if (!query.trim()) return res.json([]);
      const results = await searchMovies(query);
      const movieOnlyResults = (results || []).filter(
        (item) => !item.type || item.type === 'movie'
      );
      res.json(movieOnlyResults);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/trending', async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 20);
      const movies = await tmdb.getTrendingMovies(limit);
      res.json({ success: true, movies });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/top-movies', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 20);
      const movies = watchlistRepository.getTopMovies(limit);
      res.json({ success: true, movies });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/items', async (req, res) => {
    try {
      const { authKey, userId } = await getRequestUser(req);
      if (!authKey || !userId) {
        return res
          .status(401)
          .json({ error: 'Please sign in with your Stremio account to add movies.' });
      }

      let { id, type = 'movie' } = req.body;
      if (type === 'series') {
        return res.status(400).json({ error: 'Only movies are supported. Series cannot be added.' });
      }
      if (!id) return res.status(400).json({ error: 'Movie ID is required (e.g. tt1234567)' });

      const imdbMatch = id.match(/tt\d{7,8}/i);
      if (imdbMatch) {
        id = imdbMatch[0];
      }

      const existing = watchlistRepository.getItem(id, userId);
      if (existing) {
        return res.json({
          success: true,
          item: existing,
          message: 'Item is already in your watchlist',
        });
      }

      const meta = await getMeta('movie', id);
      if (!meta || (meta.type && meta.type !== 'movie')) {
        return res.status(400).json({ error: 'Only movies are supported. Series cannot be added.' });
      }

      const quality = await checkMovieQuality(id, 'movie', meta.name, meta.year);

      const saved = await watchlistRepository.addItem(
        {
          id: meta.id,
          type: 'movie',
          name: meta.name,
          year: meta.year,
          poster: meta.poster,
          imdbRating: meta.imdbRating ? String(meta.imdbRating) : '',
          has1080pPlus: quality.has1080pPlus,
          bestQuality: quality.bestQuality,
          streamCount: quality.streamCount,
          lastChecked: quality.checkedAt,
        },
        userId
      );

      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

      res.json({ success: true, item: saved });
    } catch (err) {
      console.error('[Add Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/check/:id', async (req, res) => {
    try {
      const { userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const item = watchlistRepository.getItem(id, userId);
      if (!item) return res.status(404).json({ error: 'Item not found in watchlist' });

      const quality = await checkMovieQuality(id, item.type || 'movie', item.name, item.year);
      const wasReady = item.has1080pPlus;

      const updated = await watchlistRepository.updateItem(
        id,
        {
          has1080pPlus: quality.has1080pPlus,
          bestQuality: quality.bestQuality,
          streamCount: quality.streamCount,
          lastChecked: quality.checkedAt,
        },
        userId
      );

      res.json({
        success: true,
        item: updated,
        becameReady: !wasReady && quality.has1080pPlus,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/check-all', async (req, res) => {
    try {
      const { userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { forceAll = true } = req.body || {};
      let items = watchlistRepository.getItems(userId).filter((i) => !i.isWatched);
      if (forceAll === false) {
        items = items.filter((i) => !i.has1080pPlus);
      }

      let newlyReady = 0;

      for (const item of items) {
        const quality = await checkMovieQuality(
          item.id,
          item.type || 'movie',
          item.name,
          item.year
        );
        const wasReady = item.has1080pPlus;

        await watchlistRepository.updateItem(
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

        if (!wasReady && quality.has1080pPlus) {
          newlyReady++;
        }

        await new Promise((r) => setTimeout(r, 600));
      }

      res.json({
        success: true,
        checkedCount: items.length,
        newlyReady,
        stats: watchlistRepository.getStats(userId),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/items/:id', async (req, res) => {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const removed = await watchlistRepository.removeItem(id, userId);

    const baseUrl = getBaseUrl(req);
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

    res.json({ success: removed, stats: watchlistRepository.getStats(userId) });
  });

  app.post('/api/items/:id/watched', async (req, res) => {
    try {
      const { authKey, userId } = await getRequestUser(req);
      if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const { watched } = req.body;
      const updated = await watchlistRepository.setWatched(id, watched !== false, userId);
      if (!updated) return res.status(404).json({ error: 'Item not found in watchlist' });

      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

      res.json({ success: true, item: updated, stats: watchlistRepository.getStats(userId) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/items/:id/min-quality', async (req, res) => {
    try {
      const { authKey, userId } = await getRequestUser(req);
      if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const { minQuality } = req.body;
      const updated = await watchlistRepository.updateItem(
        id,
        { minQuality: minQuality || null },
        userId
      );
      if (!updated) return res.status(404).json({ error: 'Item not found in watchlist' });

      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

      res.json({ success: true, item: updated, stats: watchlistRepository.getStats(userId) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/items/sync-watched', async (req, res) => {
    try {
      const { authKey, userId } = await getRequestUser(req);
      if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await watchlistRepository.syncWatchedWithStremio(authKey, userId);

      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

      res.json({
        success: true,
        result,
        items: watchlistRepository.getItems(userId),
        stats: watchlistRepository.getStats(userId),
      });
    } catch (err) {
      console.error('[Sync Watched Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/items/sync-batch', async (req, res) => {
    try {
      const { authKey, userId } = await getRequestUser(req);
      if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

      const { items: clientItems } = req.body;
      if (!Array.isArray(clientItems) || clientItems.length === 0) {
        return res.json({
          success: true,
          count: 0,
          items: watchlistRepository.getItems(userId),
          stats: watchlistRepository.getStats(userId),
        });
      }

      let added = 0;
      for (const item of clientItems) {
        if (!item || !item.id) continue;
        if (!watchlistRepository.getItem(item.id, userId)) {
          watchlistRepository.addItem(item, userId);
          added++;
          if (
            !item.bestQuality ||
            item.bestQuality === 'Pending' ||
            item.bestQuality === 'Pendente' ||
            item.bestQuality === 'Checking...' ||
            item.bestQuality === 'Verificando...'
          ) {
            checkMovieQuality(item.id, item.type || 'movie', item.name, item.year)
              .then((q) => {
                if (q) {
                  watchlistRepository.updateItem(
                    item.id,
                    {
                      has1080pPlus: q.has1080pPlus,
                      bestQuality: q.bestQuality,
                      streamCount: q.streamCount,
                    },
                    userId
                  );
                }
              })
              .catch(() => {});
          }
        }
      }

      if (added > 0) {
        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
      }

      res.json({
        success: true,
        added,
        items: watchlistRepository.getItems(userId),
        stats: watchlistRepository.getStats(userId),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/export', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId } = await getRequestUser(req);
      if (!userId) {
        return res.status(401).json({
          error:
            'Unauthorized. Please sign in with your Stremio account to export your watchlist.',
        });
      }

      let items = watchlistRepository.getItems(userId);
      if (items.length === 0 && authKey) {
        try {
          const cloudItems = await getAccountWatchlist(authKey);
          if (Array.isArray(cloudItems) && cloudItems.length > 0) {
            for (const it of cloudItems) {
              if (!watchlistRepository.getItem(it.id, userId)) {
                watchlistRepository.addItem(it, userId);
              }
            }
            items = watchlistRepository.getItems(userId);
          }
        } catch (e) {
          console.warn('[Persistence:api/export] Cloud restore warning:', e.message);
        }
      }

      res.setHeader('Content-Disposition', 'attachment; filename="stremio-watchlist.json"');
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(items, null, 2));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/import', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid items array' });
      }
      let addedCount = 0;
      for (const item of items) {
        if (item && item.id && item.name) {
          watchlistRepository.addItem(item, userId);
          addedCount++;
        }
      }

      if (addedCount > 0 && authKey) {
        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
      }

      res.json({ success: true, addedCount, stats: watchlistRepository.getStats(userId) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerWatchlistRoutes };
