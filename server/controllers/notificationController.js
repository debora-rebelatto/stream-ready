const { notificationOperationService } = require('../services');
const { getBaseUrl, getRequestUser } = require('../utils/requestContext');

async function getNotificationStatusHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    return res.json(notificationOperationService.getNotificationStatus(userId));
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function updateNotificationSettingsHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await notificationOperationService.updateNotificationSettings({
      userId,
      settings: req.body || {},
    });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

async function postTestNotificationHandler(req, res) {
  try {
    const { userId, user } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!user?.isAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden: Admin access required.' });
    }
    const { channel } = req.body || {};
    const result = await notificationOperationService.sendTestNotification({
      userId,
      channel,
      baseUrl: getBaseUrl(req),
    });
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

async function postTelegramLinkHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = notificationOperationService.generateTelegramLink({ userId });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

async function postTelegramUnlinkHandler(req, res) {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await notificationOperationService.unlinkTelegram({ userId });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

async function postTelegramWebhookHandler(req, res) {
  try {
    const result = await notificationOperationService.handleTelegramWebhook({
      body: req.body || {},
      secretHeader: req.headers['x-telegram-bot-api-secret-token'],
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ ok: false, error: err.message });
  }
}

function registerNotificationRoutes(app) {
  app.get('/api/notifications/status', getNotificationStatusHandler);
  app.post('/api/notifications/settings', updateNotificationSettingsHandler);
  app.post('/api/notifications/test', postTestNotificationHandler);
  app.post('/api/notifications/telegram/link', postTelegramLinkHandler);
  app.post('/api/notifications/telegram/unlink', postTelegramUnlinkHandler);
  app.post('/api/webhooks/telegram', postTelegramWebhookHandler);
}

module.exports = { registerNotificationRoutes };
