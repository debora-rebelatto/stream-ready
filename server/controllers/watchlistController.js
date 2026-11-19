const { watchlistOperationService } = require('../services');
const { getBaseUrl, getRequestUser } = require('../utils/requestContext');

async function getItemsHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    const { filter, tab, listId } = req.query;
    const result = await watchlistOperationService.listUserItems({
      authKey,
      userId,
      filter,
      tab,
      listId,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function searchMoviesHandler(req, res) {
  try {
    const results = await watchlistOperationService.searchMovieCatalog(req.query.q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getTrendingHandler(req, res) {
  try {
    const movies = await watchlistOperationService.getTrendingMovies(req.query.limit);
    res.json({ success: true, movies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getTopMoviesHandler(req, res) {
  try {
    const movies = await watchlistOperationService.getTopCommunityMovies(req.query.limit);
    res.json({ success: true, movies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function addItemHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) {
      return res
        .status(401)
        .json({ error: 'Please sign in with your Stremio account to add movies.' });
    }

    const result = await watchlistOperationService.addMovieToWatchlist({
      authKey,
      userId,
      id: req.body?.id,
      type: req.body?.type,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    if (!err.statusCode) console.error('[Add Error]', err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function checkSingleItemHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await watchlistOperationService.recheckSingleMovie({
      userId,
      id: req.params.id,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function checkAllItemsHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { forceAll = true } = req.body || {};
    const result = await watchlistOperationService.recheckAllMovies({ userId, forceAll });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteItemHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await watchlistOperationService.removeMovie({
      authKey,
      userId,
      id: req.params.id,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function toggleWatchedHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await watchlistOperationService.toggleMovieWatched({
      authKey,
      userId,
      id: req.params.id,
      watched: req.body?.watched,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function syncWatchedHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await watchlistOperationService.syncWatchedHistory({
      authKey,
      userId,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    console.error('[Sync Watched Error]', err);
    return res.status(500).json({ error: err.message });
  }
}

async function syncBatchHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await watchlistOperationService.syncClientBatch({
      authKey,
      userId,
      clientItems: req.body?.items,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function exportWatchlistHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized. Please sign in with your Stremio account to export your watchlist.',
      });
    }

    const items = await watchlistOperationService.exportWatchlist({ authKey, userId });
    res.setHeader('Content-Disposition', 'attachment; filename="stremio-watchlist.json"');
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(items, null, 2));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function importWatchlistHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await watchlistOperationService.importWatchlist({
      authKey,
      userId,
      items: req.body?.items,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

function registerWatchlistRoutes(app) {
  app.get('/api/items', getItemsHandler);
  app.get('/api/search', searchMoviesHandler);
  app.get('/api/trending', getTrendingHandler);
  app.get('/api/top-movies', getTopMoviesHandler);
  app.post('/api/items', addItemHandler);
  app.post('/api/check/:id', checkSingleItemHandler);
  app.post('/api/check-all', checkAllItemsHandler);
  app.delete('/api/items/:id', deleteItemHandler);
  app.post('/api/items/:id/watched', toggleWatchedHandler);
  app.post('/api/items/sync-watched', syncWatchedHandler);
  app.post('/api/items/sync-batch', syncBatchHandler);
  app.get('/api/export', exportWatchlistHandler);
  app.post('/api/import', importWatchlistHandler);
}

module.exports = { registerWatchlistRoutes };
