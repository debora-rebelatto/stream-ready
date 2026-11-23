import { api } from '../utils';
import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationStatusResponse,
  TelegramLinkResponse,
  TestNotificationResponse,
} from '../models';

export const notificationService = {
  async getStatus(): Promise<NotificationStatusResponse> {
    return api.getNotificationStatus();
  },

  async saveSettings(
    settings: Partial<NotificationPreferences>
  ): Promise<{ success: boolean; error?: string } & Partial<NotificationStatusResponse>> {
    return api.saveNotificationSettings(settings);
  },

  async sendTest(channel: NotificationChannel): Promise<TestNotificationResponse> {
    return api.testNotification(channel);
  },

  async createTelegramLink(): Promise<TelegramLinkResponse> {
    return api.createTelegramLink();
  },

  async unlinkTelegram(): Promise<
    { success: boolean; error?: string } & Partial<NotificationStatusResponse>
  > {
    return api.unlinkTelegram();
  },
};
