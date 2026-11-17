const {
  userRepository,
  watchlistRepository,
  pollRepository,
  analyticsRepository,
} = require('../repositories');
const { encodeUserData } = require('../../lib/userData');
const { logPostHog } = require('../../lib/posthogLogs');
const {
  getBaseUrl,
  getRequestUser,
  syncAddonUrlWithAccount,
  runBackgroundCheck,
} = require('../utils/requestContext');

function registerSystemRoutes(app, PORT = process.env.PORT || 7000) {
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      supabase: userRepository.isSupabaseConfigured(),
    });
  });

  app.get('/api/settings', async (req, res) => {
    const { userId } = await getRequestUser(req);
    res.json(userRepository.getSettings(userId));
  });

  app.post('/api/settings', async (req, res) => {
    try {
      const { authKey, userId } = await getRequestUser(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const updated = await userRepository.updateSettings(req.body, userId);

      if (authKey) {
        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
      }

      res.json({ success: true, settings: updated });
    } catch (err) {
      console.error('[Settings Save Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/info', async (req, res) => {
    await userRepository.ensureLoaded();
    const host = req.get('host') || `localhost:${PORT}`;
    const baseUrl = getBaseUrl(req);
    const { authKey, userId } = await getRequestUser(req);
    const items = userId ? watchlistRepository.getItems(userId) : [];
    const encoded = authKey ? encodeUserData(authKey, items) : '';

    const manifestUrl = authKey
      ? `${baseUrl}/${encoded}/manifest.json`
      : `${baseUrl}/manifest.json`;
    const stremioInstallUrl = authKey
      ? `stremio://${host}/${encoded}/manifest.json`
      : `stremio://${host}/manifest.json`;
    const webStremioInstallUrl = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl)}`;

    res.json({
      baseUrl,
      manifestUrl,
      stremioInstallUrl,
      webStremioInstallUrl,
      supabaseConfigured: userRepository.isSupabaseConfigured(),
      port: PORT,
    });
  });

  app.post('/api/events', async (req, res) => {
    try {
      const { event, data } = req.body || {};
      if (!event || typeof event !== 'string') {
        return res.status(400).json({ success: false, error: 'Event name is required' });
      }

      if (req.headers['x-opt-out-tracking'] === 'true') {
        return res.json({ success: true, ignored: true });
      }

      const user = await getRequestUser(req).catch(() => null);
      const userId = user?.userId || user?.id || null;
      const userEmail = (user?.userEmail || user?.email || '').toLowerCase().trim();

      const excludedEnvEmails =
        process.env.EXCLUDED_TRACKING_EMAILS || process.env.VITE_EXCLUDED_TRACKING_EMAILS || '';
      const excludedEnvIds =
        process.env.EXCLUDED_TRACKING_USER_IDS || process.env.VITE_EXCLUDED_TRACKING_USER_IDS || '';

      const excludedList = new Set([
        'deborarebelatto1@gmail.com',
        'debyr.dbr@gmail.com',
        ...excludedEnvEmails
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ]);
      const excludedUserIds = new Set([
        '0ae027a6-56e6-41d5-a25b-86fc1e04aed4',
        'aa1bdc75-f539-4e11-8c90-510c0e998ce8',
        ...excludedEnvIds
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ]);

      if (
        (userEmail && excludedList.has(userEmail)) ||
        (userId && (excludedUserIds.has(userId) || excludedList.has(userId)))
      ) {
        return res.json({ success: true, ignored: true });
      }

      await analyticsRepository.recordAnalyticsEvent(event, data, userId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/events/stats', async (req, res) => {
    try {
      const stats = await analyticsRepository.getAnalyticsStats();
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/poll/vote', async (req, res) => {
    try {
      const { userId } = await getRequestUser(req);
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, error: 'Please sign in to vote in the poll' });
      }
      const { option, customText } = req.body || {};
      if (!option || typeof option !== 'string') {
        return res.status(400).json({ success: false, error: 'Option is required' });
      }
      const result = await pollRepository.savePollVote(userId, option, customText);
      if (result.success) {
        analyticsRepository
          .recordAnalyticsEvent(
            'poll_voted',
            { option, hasCustomText: Boolean(customText) },
            userId
          )
          .catch(() => {});
        return res.json({ success: true, vote: result.vote });
      }
      return res.status(400).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/poll/status', async (req, res) => {
    try {
      const { userId } = await getRequestUser(req);
      if (!userId) {
        return res.json({ hasVoted: false, vote: null });
      }
      const vote = await pollRepository.getPollVote(userId);
      return res.json({ hasVoted: Boolean(vote), vote });
    } catch (err) {
      return res.status(500).json({ hasVoted: false, error: err.message });
    }
  });

  app.get('/api/poll/results', async (req, res) => {
    try {
      const results = await pollRepository.getPollResults();
      return res.json({ success: true, results });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/cron', async (req, res) => {
    try {
      logPostHog('info', 'background_check_triggered', { trigger: 'cron_endpoint' });
      runBackgroundCheck().catch((err) => console.error('[Cron Error]', err.message));
      res.json({ success: true, message: 'Automated background check triggered' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerSystemRoutes };
