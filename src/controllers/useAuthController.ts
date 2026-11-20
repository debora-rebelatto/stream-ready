import { useState, useEffect, useCallback } from 'react';
import type { StremioUser, AppSettings } from '../models';
import { authService, systemService } from '../services';
import {
  trackEvent,
  identifyUser as identifyAnalyticsUser,
  resetUser as resetAnalyticsUser,
  safeStorage,
} from '../utils';
import { getSetupCompletedStorageKey } from './useSetupWizardController';

function identifyUser(user: StremioUser) {
  identifyAnalyticsUser(user.id || user.email, { email: user.email });
}

function resetUser() {
  resetAnalyticsUser();
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

  const hydrateUserSettings = useCallback(async () => {
    try {
      const settings = await systemService.getSettings();
      if (settings) {
        setLoadedSettings(settings);
        if (onSettingsLoaded) onSettingsLoaded(settings);
      }
    } catch (err) {
      console.warn('[Auth] Failed to hydrate user settings:', err);
    }
  }, [onSettingsLoaded]);

  const checkAuth = useCallback(async () => {
    const authKey = authService.getAuthKey();
    if (!authKey) {
      setUser(null);
      setIsLoadingAuth(false);
      return;
    }

    setIsLoadingAuth(true);
    try {
      const res = await authService.getStatus();
      if (res.loggedIn && res.user) {
        identifyUser(res.user);
        setUser(res.user);
        await hydrateUserSettings();
      } else if (res.isUnauthorized) {
        console.warn('[Auth] Session expired or invalid. Clearing session.');
        resetUser();
        authService.clearAuth();
        setUser(null);
        if (onSessionCleared) onSessionCleared();
      } else {
        console.warn('[Auth] Could not verify session with server. Keeping stored session for retry.');
        setUser(null);
      }
    } catch (err) {
      console.error('[Auth] Unexpected error during checkAuth:', err);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [hydrateUserSettings, onSessionCleared]);

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
        await hydrateUserSettings();
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
        await hydrateUserSettings();
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

    trackEvent('auth_logout', {});
    resetUser();
    await authService.logout();
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

  const markOnboardingCompleted = useCallback(
    async (hasMovies: boolean): Promise<boolean> => {
      if (!user || !hasMovies) return false;
      const userKey = user.id || user.email;
      safeStorage.set(getSetupCompletedStorageKey(userKey), 'true');
      setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : prev));
      try {
        await systemService.saveSettings({ onboardingCompleted: true });
      } catch (err) {
        console.warn('[Onboarding] Failed to persist completion state:', err);
      }
      return true;
    },
    [user]
  );

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
    markOnboardingCompleted,
  };
}
