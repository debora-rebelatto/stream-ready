import { create } from 'zustand';
import type { StremioUser } from '../models';
import { authService, systemService } from '../services';
import {
  trackEvent,
  identifyUser as identifyAnalyticsUser,
  resetUser as resetAnalyticsUser,
  safeStorage,
} from '../utils';
import { getSetupCompletedStorageKey } from '../controllers/useSetupWizardController';
import { useToastStore } from './toastStore';
import { useSettingsStore } from './settingsStore';
import { useWatchlistStore } from './watchlistStore';
import { useCustomListStore } from './customListStore';

function identifyUser(user: StremioUser) {
  identifyAnalyticsUser(user.id || user.email, { email: user.email });
}

function resetUser() {
  resetAnalyticsUser();
}

export interface AuthStoreState {
  user: StremioUser | null;
  isLoadingAuth: boolean;
  setUser: (user: StremioUser | null | ((prev: StremioUser | null) => StremioUser | null)) => void;
  checkAuth: () => Promise<void>;
  loginWithCreds: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithKey: (authKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  installToAccount: () => Promise<{ success: boolean; message?: string; error?: string }>;
  markOnboardingCompleted: (hasMovies: boolean) => Promise<boolean>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  isLoadingAuth: true,

  setUser: (userOrFn) => {
    set((state) => ({
      user: typeof userOrFn === 'function' ? userOrFn(state.user) : userOrFn,
    }));
  },

  checkAuth: async () => {
    const authKey = authService.getAuthKey();
    if (!authKey) {
      set({ user: null, isLoadingAuth: false });
      return;
    }

    set({ isLoadingAuth: true });
    try {
      const res = await authService.getStatus();
      if (res.loggedIn && res.user) {
        identifyUser(res.user);
        set({ user: res.user });

        // Safe settings hydration: settings load failure must not invalidate session
        try {
          const settings = await systemService.getSettings();
          if (settings) {
            useSettingsStore.getState().applyLoadedSettings(settings);
          }
        } catch (settingsErr) {
          console.warn('[Auth] Settings load failed during checkAuth:', settingsErr);
        }
        return;
      }

      if (res.isUnauthorized) {
        // Token was rejected as expired or invalid (HTTP 401)
        console.warn('[Auth] Session expired or invalid. Clearing session.');
        resetUser();
        authService.clearAuth();
        set({ user: null });
        return;
      }

      // Transient network or server error (5xx) — preserve stored authKey for retry
      console.warn('[Auth] Could not verify session with server. Keeping stored session for retry.');
      set({ user: null });
    } catch (err) {
      console.error('[Auth] Unexpected error during checkAuth:', err);
      set({ user: null });
    } finally {
      set({ isLoadingAuth: false });
    }
  },

  loginWithCreds: async (email: string, pass: string) => {
    const showToast = useToastStore.getState().showToast;
    try {
      const res = await authService.login({ email, password: pass });
      if (res.success && res.authKey && res.user) {
        const currentUser = get().user;
        if (authService.getAuthKey() && currentUser?.id !== res.user.id) {
          resetUser();
        }
        identifyUser(res.user);
        authService.setAuthKey(res.authKey, res.user.email);
        set({ user: res.user });

        try {
          const settings = await systemService.getSettings();
          if (settings) {
            useSettingsStore.getState().applyLoadedSettings(settings);
          }
        } catch (settingsErr) {
          console.warn('[Auth] Settings load failed after login:', settingsErr);
        }

        trackEvent('auth_login_success', { method: 'credentials' });
        showToast(`🎉 Welcome, ${res.user.email}!`, 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  },

  loginWithKey: async (authKey: string) => {
    const showToast = useToastStore.getState().showToast;
    try {
      const res = await authService.login({ authKey });
      if (res.success && res.authKey && res.user) {
        const currentUser = get().user;
        if (authService.getAuthKey() && currentUser?.id !== res.user.id) {
          resetUser();
        }
        identifyUser(res.user);
        authService.setAuthKey(res.authKey, res.user.email);
        set({ user: res.user });

        try {
          const settings = await systemService.getSettings();
          if (settings) {
            useSettingsStore.getState().applyLoadedSettings(settings);
          }
        } catch (settingsErr) {
          console.warn('[Auth] Settings load failed after login:', settingsErr);
        }

        trackEvent('auth_login_success', { method: 'authKey' });
        showToast(`🎉 Connected as ${res.user.email}!`, 'success');
        return { success: true };
      }
      return { success: false, error: res.error || 'Invalid AuthKey' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  },

  logout: async () => {
    const showToast = useToastStore.getState().showToast;
    authService.clearAuth();
    set({ user: null });

    // Clean up domain stores on logout
    useWatchlistStore.getState().clearWatchlistState();
    useCustomListStore.getState().clearCustomListsState();

    showToast('Signed out successfully.', 'info');
    trackEvent('auth_logout', {});
    resetUser();
    await authService.logout();
  },

  deleteAccount: async () => {
    const showToast = useToastStore.getState().showToast;
    try {
      const res = await authService.deleteAccount();
      if (res.success) {
        trackEvent('account_deleted', {});
        resetUser();
        authService.clearAuth();
        set({ user: null });

        useWatchlistStore.getState().clearWatchlistState();
        useCustomListStore.getState().clearCustomListsState();

        showToast('Your account and all associated data have been permanently deleted.', 'success');
        return { success: true };
      }
      showToast(res.error || 'Failed to delete account.', 'error');
      return { success: false, error: res.error };
    } catch (err: any) {
      showToast('Error communicating with server.', 'error');
      return { success: false, error: err.message };
    }
  },

  installToAccount: async () => {
    const showToast = useToastStore.getState().showToast;
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
  },

  markOnboardingCompleted: async (hasMovies: boolean): Promise<boolean> => {
    const user = get().user;
    if (!user || !hasMovies) return false;
    const userKey = user.id || user.email;
    safeStorage.set(getSetupCompletedStorageKey(userKey), 'true');
    set((state) => ({
      user: state.user ? { ...state.user, onboardingCompleted: true } : null,
    }));
    try {
      await systemService.saveSettings({ onboardingCompleted: true });
    } catch (err) {
      console.warn('[Onboarding] Failed to persist completion state:', err);
    }
    return true;
  },
}));
