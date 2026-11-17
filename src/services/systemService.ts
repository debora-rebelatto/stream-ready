import { api } from '../lib/api';
import type { ServerInfo, AppSettings } from '../types';

export const systemService = {
  /**
   * Fetches server status, version, and platform metadata
   */
  async getInfo(): Promise<ServerInfo> {
    return api.getInfo();
  },

  /**
   * Loads user settings and notification preferences
   */
  async getSettings(): Promise<AppSettings> {
    return api.getSettings();
  },

  /**
   * Updates user settings and notification preferences
   */
  async saveSettings(
    settings: Partial<AppSettings>
  ): Promise<{ success: boolean; settings: AppSettings }> {
    return api.saveSettings(settings);
  },
};
