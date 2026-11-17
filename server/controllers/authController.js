const { userRepository, watchlistRepository } = require('../repositories');
const { getManifest } = require('../../lib/stremioAddon');
const {
  loginStremio,
  getUserInfo,
  getAccountWatchlist,
  saveAccountWatchlist,
} = require('../../lib/stremioAuth');
const {
  getBaseUrl,
  getRequestAuthKey,
  getRequestUser,
  syncAddonUrlWithAccount,
  userSyncThrottle,
  triggerUserOnDemandSync,
} = require('../utils/requestContext');

function registerAuthRoutes(app) {
  app.post('/api/auth/login', async (req, res) => {
    try {
      await userRepository.ensureLoaded(true);
      const { email, password, authKey } = req.body;

      if (authKey) {
        const user = await userRepository.resolveUser(authKey, getUserInfo);
        if (!user || !user.email) {
          return res
            .status(401)
            .json({ success: false, error: 'Invalid or expired authentication key (AuthKey)' });
        }

        if (watchlistRepository.getItems(user.id).length === 0) {
          try {
            const cloudItems = await getAccountWatchlist(authKey);
            if (Array.isArray(cloudItems) && cloudItems.length > 0) {
              for (const it of cloudItems) {
                if (!watchlistRepository.getItem(it.id, user.id)) {
                  await watchlistRepository.addItem(it, user.id);
                }
              }
            }
          } catch {}
        }

        const baseUrl = getBaseUrl(req);
        syncAddonUrlWithAccount(authKey, baseUrl, user.id).catch(() => {});
        const userSettings = userRepository.getSettings(user.id);
        if (userSettings && (userSettings.autoSyncWatched || userSettings.trackWatchlistWatched)) {
          watchlistRepository.syncWatchedWithStremio(authKey, user.id).catch(() => {});
        }

        return res.json({ success: true, authKey, user });
      }

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }

      const authResult = await loginStremio(email, password);
      if (!authResult.success) {
        return res.status(401).json({ success: false, error: authResult.error });
      }

      const user = await userRepository.resolveUser(authResult.authKey, () => authResult.user);
      const userId = user ? user.id : authResult.user.email;

      if (watchlistRepository.getItems(userId).length === 0) {
        try {
          const cloudItems = await getAccountWatchlist(authResult.authKey);
          if (Array.isArray(cloudItems) && cloudItems.length > 0) {
            for (const it of cloudItems) {
              if (!watchlistRepository.getItem(it.id, userId)) {
                await watchlistRepository.addItem(it, userId);
              }
            }
          }
        } catch {}
      }

      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authResult.authKey, baseUrl, userId).catch(() => {});
      const loginUserSettings = userRepository.getSettings(userId);
      if (
        loginUserSettings &&
        (loginUserSettings.autoSyncWatched || loginUserSettings.trackWatchlistWatched)
      ) {
        watchlistRepository.syncWatchedWithStremio(authResult.authKey, userId).catch(() => {});
      }

      res.json({ success: true, authKey: authResult.authKey, user });
    } catch (err) {
      console.error('[Auth Error]', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const authKey = getRequestAuthKey(req);
      if (!authKey) {
        return res.status(401).json({ loggedIn: false });
      }

      const user = await userRepository.resolveUser(authKey, getUserInfo);
      if (!user || !user.id || !user.email) {
        return res
          .status(401)
          .json({ loggedIn: false, error: 'Invalid or expired Stremio session' });
      }

      const userId = user.id;
      triggerUserOnDemandSync(authKey, userId);

      if (watchlistRepository.getItems(userId).length === 0) {
        try {
          const cloudItems = await getAccountWatchlist(authKey);
          if (Array.isArray(cloudItems) && cloudItems.length > 0) {
            for (const it of cloudItems) {
              if (!watchlistRepository.getItem(it.id, userId)) {
                await watchlistRepository.addItem(it, userId);
              }
            }
          }
        } catch (cloudErr) {
          console.warn('[Persistence:auth/me] Cloud restore warning:', cloudErr.message);
        }
      }

      res.json({
        loggedIn: true,
        authKey,
        user: {
          id: user.id,
          email: user.email,
        },
        itemsCount: watchlistRepository.getItems(userId).length,
        supabaseConfigured: userRepository.isSupabaseConfigured(),
      });
    } catch (err) {
      res.status(500).json({ loggedIn: false, error: err.message });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
  });

  app.delete(['/api/auth/account', '/api/account'], async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { authKey, userId, userEmail } = await getRequestUser(req);

      if (!userId && !userEmail) {
        return res
          .status(401)
          .json({ success: false, error: 'Unauthorized: Session invalid or user not found' });
      }

      if (authKey) {
        try {
          const { removeAccountAddon } = require('../../lib/stremioAuth');
          if (typeof removeAccountAddon === 'function') {
            await removeAccountAddon(authKey);
          }
        } catch (addonErr) {
          console.warn(
            '[DeleteAccount] Notice when removing addon from Stremio account:',
            addonErr.message
          );
        }
      }

      if (userId) {
        userSyncThrottle.delete(userId);
      }

      await userRepository.deleteUser(userId || userEmail);

      res.json({
        success: true,
        message: 'Account and all related data have been permanently deleted.',
      });
    } catch (err) {
      console.error('[DeleteAccount Error]', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to delete account' });
    }
  });

  app.post('/api/auth/install-account', async (req, res) => {
    try {
      const { authKey, userId } = await getRequestUser(req);
      if (!authKey || !userId) {
        return res.status(401).json({ error: 'You must be signed in with your Stremio account' });
      }

      const baseUrl = getBaseUrl(req);
      const items = watchlistRepository.getItems(userId);
      const manifest = getManifest(baseUrl, userId);

      const success = await saveAccountWatchlist(authKey, baseUrl, items, manifest);
      if (!success) {
        return res
          .status(400)
          .json({ error: 'Failed to save addon to your official Stremio account.' });
      }

      res.json({
        success: true,
        message:
          'Addon activated on your official account! It will now appear on your Smart TV and all your devices.',
      });
    } catch (err) {
      console.error('[Install to Account Error]', err);
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerAuthRoutes };
