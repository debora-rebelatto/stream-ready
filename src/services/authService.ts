import { api, getAuthKey, setAuthKey, clearAuth } from '../utils';
import type { StremioUser } from '../models';

export const authService = {
  getAuthKey,
  setAuthKey,
  clearAuth,

  async getStatus(): Promise<{ loggedIn: boolean; user?: StremioUser; isUnauthorized?: boolean }> {
    return api.getAuthStatus();
  },

  async login(creds: { email?: string; password?: string; authKey?: string }) {
    return api.login(creds);
  },

  async logout(): Promise<void> {
    return api.logout();
  },

  async deleteAccount(): Promise<{ success: boolean; message?: string; error?: string }> {
    return api.deleteAccount();
  },

  async installToAccount(): Promise<{ success: boolean; message?: string; error?: string }> {
    return api.installToAccount();
  },
};
