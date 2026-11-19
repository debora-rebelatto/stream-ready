const { authOperationService } = require('../services');
const {
  getBaseUrl,
  getRequestAuthKey,
  getRequestUser,
} = require('../utils/requestContext');

async function loginHandler(req, res) {
  try {
    const { email, password, authKey } = req.body || {};
    const result = await authOperationService.authenticateUser({
      email,
      password,
      authKey,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    if (!err.statusCode) console.error('[Auth Error]', err);
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
}

async function getMeHandler(req, res) {
  try {
    const authKey = getRequestAuthKey(req);
    const { statusCode, body } = await authOperationService.getSessionStatus({ authKey });
    return res.status(statusCode).json(body);
  } catch (err) {
    return res.status(500).json({ loggedIn: false, error: err.message });
  }
}

function logoutHandler(req, res) {
  res.json({ success: true });
}

async function deleteAccountHandler(req, res) {
  try {
    const { authKey, userId, userEmail } = await getRequestUser(req);
    const result = await authOperationService.deleteUserAccount({ authKey, userId, userEmail });
    return res.json(result);
  } catch (err) {
    if (!err.statusCode) console.error('[DeleteAccount Error]', err);
    return res
      .status(err.statusCode || 500)
      .json({ success: false, error: err.message || 'Failed to delete account' });
  }
}

async function installAccountHandler(req, res) {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) {
      return res.status(401).json({ error: 'You must be signed in with your Stremio account' });
    }

    const result = await authOperationService.installAddonToAccount({
      authKey,
      userId,
      baseUrl: getBaseUrl(req),
    });
    return res.json(result);
  } catch (err) {
    if (!err.statusCode) console.error('[Install to Account Error]', err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
}

function registerAuthRoutes(app) {
  app.post('/api/auth/login', loginHandler);
  app.get('/api/auth/me', getMeHandler);
  app.post('/api/auth/logout', logoutHandler);
  app.delete(['/api/auth/account', '/api/account'], deleteAccountHandler);
  app.post('/api/auth/install-account', installAccountHandler);
}

module.exports = { registerAuthRoutes };
