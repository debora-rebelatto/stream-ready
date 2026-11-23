export type AudioPreference = 'any' | 'surround' | 'atmos';

export type NotificationChannel = 'telegram' | 'discord' | 'email';

export interface NotificationPreferences {
  notificationsEnabled: boolean;
  discordNotificationsEnabled: boolean;
  discordWebhookUrl: string | null;
  hasDiscordWebhook: boolean;
  telegramNotificationsEnabled: boolean;
  telegramChatId: string | null;
  emailNotificationsEnabled: boolean;
  notificationEmail: string | null;
}

export interface NotificationChannelAvailability {
  telegramBotConfigured: boolean;
  telegramBotUsername: string | null;
  smtpConfigured: boolean;
  discordSupported: boolean;
}

export interface NotificationStatusResponse {
  settings: NotificationPreferences;
  accountEmail: string | null;
  availability: NotificationChannelAvailability;
}

export interface TelegramLinkResponse {
  success: boolean;
  deepLink?: string;
  botUsername?: string;
  expiresInSeconds?: number;
  error?: string;
}

export interface TestNotificationResponse {
  success: boolean;
  channel?: NotificationChannel;
  error?: string;
}

export interface QualityCriteria {
  minQuality?: '1080p' | '4k';
  minAudio?: AudioPreference;
}

export interface AppSettings extends QualityCriteria {
  stremioAuthKey?: string | null;
  autoSyncWatched?: boolean;
  trackWatchlistWatched?: boolean;
  syncPreviouslyWatched?: boolean;
  onboardingCompleted?: boolean;
}

export interface ServerInfo {
  baseUrl: string;
  manifestUrl: string;
  stremioInstallUrl: string;
  webStremioInstallUrl: string;
  supabaseConfigured: boolean;
  port: number;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}
