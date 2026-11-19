const { customListOperationService } = require('../services');
const { getBaseUrl, getRequestUser } = require('../utils/requestContext');

async function getListsHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const lists = await customListOperationService.getUserListsWithCounts(userId);
    return res.json({ success: true, lists });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function createListHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const list = await customListOperationService.createList({
      authKey,
      userId,
      name: req.body?.name,
      emoji: req.body?.emoji,
      baseUrl: getBaseUrl(req),
    });
    return res.json({ success: true, list });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function updateListHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const list = await customListOperationService.updateList({
      authKey,
      userId,
      listId: req.params.id,
      name: req.body?.name,
      emoji: req.body?.emoji,
      baseUrl: getBaseUrl(req),
    });
    return res.json({ success: true, list });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function deleteListHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await customListOperationService.deleteList({
      authKey,
      userId,
      listId: req.params.id,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function setItemListsHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const item = await customListOperationService.assignItemLists({
      authKey,
      userId,
      itemId: req.params.id,
      listIds: req.body?.listIds,
      baseUrl: getBaseUrl(req),
    });
    return res.json({ success: true, item });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getCuratedListsHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    const lists = await customListOperationService.listCuratedCatalogs(userId);
    return res.json({ success: true, lists });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function addCuratedListHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId || !authKey) {
      return res
        .status(401)
        .json({ error: 'Please sign in with your Stremio account to add curated lists.' });
    }

    const result = await customListOperationService.adoptCuratedList({
      authKey,
      userId,
      curatedListId: req.params.id,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function registerCustomListRoutes(app) {
  app.get('/api/lists', getListsHandler);
  app.post('/api/lists', createListHandler);
  app.put('/api/lists/:id', updateListHandler);
  app.delete('/api/lists/:id', deleteListHandler);
  app.post('/api/items/:id/lists', setItemListsHandler);
  app.get('/api/curated-lists', getCuratedListsHandler);
  app.post('/api/curated-lists/:id/add', addCuratedListHandler);
}

module.exports = { registerCustomListRoutes };
