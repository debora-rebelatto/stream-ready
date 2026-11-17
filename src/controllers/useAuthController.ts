import { useState, useEffect, useCallback } from 'react';
import type { StremioUser, AppSettings } from '../models';
import { authService, systemService } from '../services';
import {
  trackEvent,
  identifyUser as identifyAnalyticsUser,
  resetUser as resetAnalyticsUser,
} from '../utils';

function identifyUser(user: StremioUser) {
  try {
    identifyAnalyticsUser(user.id || user.email, { email: user.email });
  } catch {}
}

function resetUser() {
  try {
    resetAnalyticsUser();
  } catch {}
}

export interface UseAuthControllerOptions {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  onSettingsLoaded?: (settings: AppSettings) => void;
  onSessionCleared?: () => void;
}

export function useAuthController({
  showToast,
  onSettingsLoaded,
  onSessionCleared,
}: UseAuthControllerOptions) {
  const [user, setUser] = useState<StremioUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [loadedSettings, setLoadedSettings] = useState<AppSettings | null>(null);

  const checkAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    const hadStoredSession = Boolean(authService.getAuthKey());
    try {
      const res = await authService.getStatus();
      if (res.loggedIn && res.user) {
        identifyUser(res.user);
        setUser(res.user);
        try {
          const settings = await systemService.getSettings();
          if (settings) {
            setLoadedSettings(settings);
            if (onSettingsLoaded) onSettingsLoaded(settings);
          }
        } catch {}
      } else if (res.isUnauthorized) {
        if (hadStoredSession) resetUser();
        setUser(null);
        authService.clearAuth();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [onSettingsLoaded]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const loginWithCreds = async (email: string, pass: string) => {
    try {
      const res = await authService.login({ email, password: pass });
      if (res.success && res.authKey && res.user) {
        if (authService.getAuthKey() && user?.id !== res.user.id) resetUser();
        identifyUser(res.user);
        authService.setAuthKey(res.authKey, res.user.email);
        setUser(res.user);
        trackEvent('auth_login_success', { method: 'credentials' });
        showToast(`🎉 Welcome, ${res.user.email}!`, 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const loginWithKey = async (authKey: string) => {
    try {
      const res = await authService.login({ authKey });
      if (res.success && res.authKey && res.user) {
        if (authService.getAuthKey() && user?.id !== res.user.id) resetUser();
        identifyUser(res.user);
        authService.setAuthKey(res.authKey, res.user.email);
        setUser(res.user);
        trackEvent('auth_login_success', { method: 'authKey' });
        showToast(`🎉 Connected as ${res.user.email}!`, 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid AuthKey' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const logout = async () => {
    authService.clearAuth();
    setUser(null);
    if (onSessionCleared) onSessionCleared();
    showToast('Signed out successfully.', 'info');

    try {
      trackEvent('auth_logout', {});
    } catch {}
    try {
      resetUser();
    } catch {}
    try {
      await authService.logout();
    } catch {}
  };

  const deleteAccount = async () => {
    try {
      const res = await authService.deleteAccount();
      if (res.success) {
        trackEvent('account_deleted', {});
        resetUser();
        authService.clearAuth();
        setUser(null);
        if (onSessionCleared) onSessionCleared();
        showToast('Your account and all associated data have been permanently deleted.', 'success');
        return { success: true };
      }
      showToast(res.error || 'Failed to delete account.', 'error');
      return { success: false, error: res.error };
    } catch (err: any) {
      showToast('Error communicating with server.', 'error');
      return { success: false, error: err.message };
    }
  };

  const installToAccount = async () => {
    try {
      const res = await authService.installToAccount();
      if (res.success) {
        trackEvent('addon_install_clicked', { location: 'navbar' });
        showToast(
          '🎉 Addon installed to Stremio! Remember to search and add your movies here on the website.',
          'success'
        );
        return { success: true };
      }
      showToast(res.error || 'Failed to install to account.', 'error');
      return { success: false, error: res.error };
    } catch (err: any) {
      showToast('Error communicating with server.', 'error');
      return { success: false, error: err.message };
    }
  };

  return {
    user,
    setUser,
    isLoadingAuth,
    loadedSettings,
    loginWithCreds,
    loginWithKey,
    logout,
    deleteAccount,
    installToAccount,
  };
}
