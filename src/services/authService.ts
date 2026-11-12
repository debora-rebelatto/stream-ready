import { api, getAuthKey, setAuthKey, clearAuth } from '../lib/api';
import type { StremioUser } from '../types';

export const authService = {
  getAuthKey,
  setAuthKey,
  clearAuth,

  async getStatus(): Promise<{ loggedIn: boolean; user?: StremioUser }> {
    return api.getAuthStatus();
  },

  async login(creds: { email?: string; password?: string; authKey?: string }) {
    return api.login(creds);
  },

  async logout(): Promise<void> {
    return api.logout();
  },

  async installToAccount(): Promise<{ success: boolean; message?: string; error?: string }> {
    return api.installToAccount();
  },
};
