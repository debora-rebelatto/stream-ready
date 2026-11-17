const db = require('../../lib/db');
const { userRepository, watchlistRepository, customListRepository } = require('../repositories');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { getCuratedLists, addCuratedListToUser } = require('../../lib/curatedLists');
const {
  getBaseUrl,
  getRequestUser,
  syncAddonUrlWithAccount,
} = require('../utils/requestContext');

function registerCustomListRoutes(app) {
  app.get('/api/lists', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const lists = customListRepository.getCustomLists(userId);
      const userItems = watchlistRepository.getItems(userId);

      const listsWithCount = lists.map((l) => {
        const count = userItems.filter(
          (i) => Array.isArray(i.customLists) && i.customLists.includes(l.id)
        ).length;
        return {
          ...l,
          itemsCount: count,
        };
      });

      res.json({ success: true, lists: listsWithCount });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/lists', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, emoji } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'List name is required' });
      }

      const newList = await customListRepository.createCustomList(userId, { name, emoji });

      if (authKey) {
        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
      }

      res.json({ success: true, list: { ...newList, itemsCount: 0 } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/lists/:id', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const { name, emoji } = req.body;

      const updated = await customListRepository.updateCustomList(userId, id, { name, emoji });

      if (authKey) {
        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
      }

      res.json({ success: true, list: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/lists/:id', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const result = await customListRepository.deleteCustomList(userId, id);

      if (authKey) {
        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
      }

      res.json(typeof result === 'object' && result !== null ? result : { success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/items/:id/lists', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const { listIds } = req.body;

      const updatedItem = await customListRepository.setItemCustomLists(userId, id, listIds);

      if (authKey) {
        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
      }

      res.json({ success: true, item: updatedItem });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/curated-lists', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { userId } = await getRequestUser(req);
      const userCustomLists = userId ? customListRepository.getCustomLists(userId) : [];
      const lists = getCuratedLists(userCustomLists);
      res.json({ success: true, lists });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/curated-lists/:id/add', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId } = await getRequestUser(req);
      if (!userId || !authKey) {
        return res
          .status(401)
          .json({ error: 'Please sign in with your Stremio account to add curated lists.' });
      }

      const { id } = req.params;
      const result = await addCuratedListToUser(userId, id, db, checkMovieQuality);

      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerCustomListRoutes };
