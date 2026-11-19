const { systemOperationService } = require('../services');
const { getBaseUrl, getRequestUser } = require('../utils/requestContext');

function getHealthHandler(req, res) {
  res.json(systemOperationService.getHealthStatus());
}

async function getSettingsHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    res.json(systemOperationService.getUserSettings(userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateSettingsHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const settings = await systemOperationService.updateUserSettings({
      authKey,
      userId,
      settings: req.body,
      baseUrl: getBaseUrl(req),
    });
    return res.json({ success: true, settings });
  } catch (err) {
    console.error('[Settings Save Error]', err);
    return res.status(500).json({ error: err.message });
  }
}

function createInfoHandler(port) {
  return async function getInfoHandler(req, res) {
    try {
      const host = req.get('host') || `localhost:${port}`;
      const baseUrl = getBaseUrl(req);
      const { authKey } = await getRequestUser(req);
      const info = await systemOperationService.getSystemInfo({
        host,
        baseUrl,
        authKey,
        port,
      });
      res.json(info);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}

async function postEventHandler(req, res) {
  try {
    const { event, data } = req.body || {};
    const user = await getRequestUser(req).catch(() => null);
    const result = await systemOperationService.recordClientEvent({
      event,
      data,
      optOutHeader: req.headers['x-opt-out-tracking'],
      user,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

async function getEventsStatsHandler(req, res) {
  try {
    const stats = await systemOperationService.getAnalyticsSummary();
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function postPollVoteHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: 'Please sign in to vote in the poll' });
    }
    const { option, customText } = req.body || {};
    const result = await systemOperationService.submitPollVote({ userId, option, customText });
    if (result.success) {
      return res.json({ success: true, vote: result.vote });
    }
    return res.status(400).json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

async function getPollStatusHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    const status = await systemOperationService.getUserPollStatus(userId);
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ hasVoted: false, error: err.message });
  }
}

async function getPollResultsHandler(req, res) {
  try {
    const results = await systemOperationService.getPollResultsSummary();
    return res.json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

async function getCronHandler(req, res) {
  try {
    const result = await systemOperationService.triggerCronCheck({
      authHeader: req.headers['authorization'],
      querySecret: req.query.secret,
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

function registerSystemRoutes(app, PORT = process.env.PORT || 7000) {
  app.get('/health', getHealthHandler);
  app.get('/api/settings', getSettingsHandler);
  app.post('/api/settings', updateSettingsHandler);
  app.get('/api/info', createInfoHandler(PORT));
  app.post('/api/events', postEventHandler);
  app.get('/api/events/stats', getEventsStatsHandler);
  app.post('/api/poll/vote', postPollVoteHandler);
  app.get('/api/poll/status', getPollStatusHandler);
  app.get('/api/poll/results', getPollResultsHandler);
  app.get('/api/cron', getCronHandler);
}

module.exports = { registerSystemRoutes };
