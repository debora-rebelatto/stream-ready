const { userRepository, watchlistRepository } = require('../repositories');
const { getManifest } = require('../../lib/stremioAddon');
const {
  loginStremio,
  getUserInfo,
  saveAccountWatchlist,
  removeAccountAddon,
} = require('../../lib/stremioAuth');
const {
  syncAddonUrlWithAccount,
  userSyncThrottle,
  triggerUserOnDemandSync,
} = require('../utils/requestContext');
const { watchlistOperationService } = require('./watchlistOperationService');
const { systemOperationService } = require('./systemOperationService');

function triggerPostLoginBackgroundSync(authKey, baseUrl, userId) {
  if (baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }
  const userSettings = userRepository.getSettings(userId);
  if (userSettings && (userSettings.autoSyncWatched || userSettings.trackWatchlistWatched)) {
    watchlistRepository.syncWatchedWithStremio(authKey, userId).catch(() => {});
  }
}

async function authenticateUser({ email, password, authKey, baseUrl }) {
  const forceRefresh = Boolean(process.env.VERCEL);

  if (authKey) {
    await userRepository.ensureLoaded(forceRefresh);
    const user = await userRepository.resolveUser(authKey, getUserInfo);
    if (!user || !user.email) {
      const err = new Error('Invalid or expired authentication key (AuthKey)');
      err.statusCode = 401;
      throw err;
    }

    await watchlistOperationService.restoreCloudWatchlistIfEmpty(authKey, user.id, 'auth/login');
    triggerPostLoginBackgroundSync(authKey, baseUrl, user.id);

    return {
      success: true,
      authKey,
      user: {
        ...user,
        trackingExcluded: systemOperationService.isTrackingExcludedUser(user),
      },
    };
  }

  if (!email || !password) {
    const err = new Error('Email and password are required');
    err.statusCode = 400;
    throw err;
  }

  const [authResult] = await Promise.all([
    loginStremio(email, password),
    userRepository.ensureLoaded(forceRefresh),
  ]);
  if (!authResult.success) {
    const err = new Error(authResult.error || 'Authentication failed');
    err.statusCode = 401;
    throw err;
  }

  const user = await userRepository.resolveUser(authResult.authKey, () => authResult.user);
  const userId = user ? user.id : authResult.user.email;

  await watchlistOperationService.restoreCloudWatchlistIfEmpty(
    authResult.authKey,
    userId,
    'auth/login'
  );
  triggerPostLoginBackgroundSync(authResult.authKey, baseUrl, userId);

  return {
    success: true,
    authKey: authResult.authKey,
    user: user
      ? {
          ...user,
          trackingExcluded: systemOperationService.isTrackingExcludedUser(user),
        }
      : user,
  };
}

async function getSessionStatus({ authKey }) {
  await userRepository.ensureLoaded();
  if (!authKey) {
    return { statusCode: 401, body: { loggedIn: false } };
  }

  const user = await userRepository.resolveUser(authKey, getUserInfo);
  if (!user || !user.id || !user.email) {
    return {
      statusCode: 401,
      body: { loggedIn: false, error: 'Invalid or expired Stremio session' },
    };
  }

  const userId = user.id;
  triggerUserOnDemandSync(authKey, userId);
  await watchlistOperationService.restoreCloudWatchlistIfEmpty(authKey, userId, 'auth/me');

  return {
    statusCode: 200,
    body: {
      loggedIn: true,
      authKey,
      user: {
        id: user.id,
        email: user.email,
        isAdmin: Boolean(user.isAdmin),
        onboardingCompleted: Boolean(user.onboardingCompleted),
        trackingExcluded: systemOperationService.isTrackingExcludedUser(user),
      },
      itemsCount: watchlistRepository.getItems(userId).length,
      supabaseConfigured: userRepository.isSupabaseConfigured(),
    },
  };
}

async function deleteUserAccount({ authKey, userId, userEmail }) {
  await userRepository.ensureLoaded();

  if (!userId && !userEmail) {
    const err = new Error('Unauthorized: Session invalid or user not found');
    err.statusCode = 401;
    throw err;
  }

  if (authKey && typeof removeAccountAddon === 'function') {
    try {
      await removeAccountAddon(authKey);
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

  return {
    success: true,
    message: 'Account and all related data have been permanently deleted.',
  };
}

async function installAddonToAccount({ authKey, userId, baseUrl }) {
  const items = watchlistRepository.getItems(userId);
  const manifest = getManifest(baseUrl, userId);

  const success = await saveAccountWatchlist(authKey, baseUrl, items, manifest);
  if (!success) {
    const err = new Error('Failed to save addon to your official Stremio account.');
    err.statusCode = 400;
    throw err;
  }

  return {
    success: true,
    message:
      'Addon activated on your official account! It will now appear on your Smart TV and all your devices.',
  };
}

const authOperationService = {
  authenticateUser,
  getSessionStatus,
  deleteUserAccount,
  installAddonToAccount,
};

module.exports = { authOperationService };
