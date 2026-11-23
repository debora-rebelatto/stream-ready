const DEFAULT_NOTIFICATION_SETTINGS = {
  notificationsEnabled: false,
  discordWebhookUrl: null,
  discordNotificationsEnabled: false,
  telegramChatId: null,
  telegramNotificationsEnabled: false,
  emailNotificationsEnabled: false,
  notificationEmail: null,
};

function maskDiscordWebhookUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(https:\/\/[^/]+\/api\/webhooks\/\d+\/)([\w-]+)$/i);
  if (!match) return '********';
  const token = match[2];
  const tail = token.length > 6 ? token.slice(-6) : '***';
  return `${match[1]}••••••${tail}`;
}

function formatPublicNotificationSettings(settings = {}) {
  const rawWebhook = settings.discordWebhookUrl || null;
  return {
    notificationsEnabled: Boolean(settings.notificationsEnabled),
    discordNotificationsEnabled: Boolean(settings.discordNotificationsEnabled),
    discordWebhookUrl: maskDiscordWebhookUrl(rawWebhook),
    hasDiscordWebhook: Boolean(rawWebhook),
    telegramNotificationsEnabled: Boolean(settings.telegramNotificationsEnabled),
    telegramChatId: settings.telegramChatId ? String(settings.telegramChatId) : null,
    emailNotificationsEnabled: Boolean(settings.emailNotificationsEnabled),
    notificationEmail: settings.notificationEmail ? String(settings.notificationEmail) : null,
  };
}

function sanitizeNotificationSettingsPatch(patch = {}) {
  const clean = {};

  if (patch.notificationsEnabled !== undefined) {
    clean.notificationsEnabled = Boolean(patch.notificationsEnabled);
  }
  if (patch.discordNotificationsEnabled !== undefined) {
    clean.discordNotificationsEnabled = Boolean(patch.discordNotificationsEnabled);
  }
  if (patch.telegramNotificationsEnabled !== undefined) {
    clean.telegramNotificationsEnabled = Boolean(patch.telegramNotificationsEnabled);
  }
  if (patch.emailNotificationsEnabled !== undefined) {
    clean.emailNotificationsEnabled = Boolean(patch.emailNotificationsEnabled);
  }

  if (patch.discordWebhookUrl !== undefined) {
    if (patch.discordWebhookUrl === null || patch.discordWebhookUrl === '') {
      clean.discordWebhookUrl = null;
    } else if (
      typeof patch.discordWebhookUrl === 'string' &&
      !patch.discordWebhookUrl.includes('••••••') &&
      patch.discordWebhookUrl !== '********'
    ) {
      clean.discordWebhookUrl = patch.discordWebhookUrl.trim();
    }
  }

  if (patch.telegramChatId !== undefined) {
    if (patch.telegramChatId === null || patch.telegramChatId === '') {
      clean.telegramChatId = null;
    } else if (typeof patch.telegramChatId === 'string' || typeof patch.telegramChatId === 'number') {
      clean.telegramChatId = String(patch.telegramChatId).trim();
    }
  }

  if (patch.notificationEmail !== undefined) {
    if (patch.notificationEmail === null || patch.notificationEmail === '') {
      clean.notificationEmail = null;
    } else if (typeof patch.notificationEmail === 'string') {
      clean.notificationEmail = patch.notificationEmail.trim().toLowerCase();
    }
  }

  return clean;
}

function mapNotificationSettingsToRow(settings = {}, encryptFn) {
  const rawWebhook = settings.discordWebhookUrl || null;
  return {
    notifications_enabled: Boolean(settings.notificationsEnabled),
    discord_webhook_url: rawWebhook ? encryptFn(rawWebhook) : null,
    discord_notifications_enabled: Boolean(settings.discordNotificationsEnabled),
    telegram_chat_id: settings.telegramChatId ? String(settings.telegramChatId) : null,
    telegram_notifications_enabled: Boolean(settings.telegramNotificationsEnabled),
    email_notifications_enabled: Boolean(settings.emailNotificationsEnabled),
    notification_email: settings.notificationEmail ? String(settings.notificationEmail) : null,
  };
}

function mapRowToNotificationSettings(row = {}, decryptFn) {
  return {
    notificationsEnabled: Boolean(row.notifications_enabled),
    discordWebhookUrl: row.discord_webhook_url ? decryptFn(row.discord_webhook_url) : null,
    discordNotificationsEnabled: Boolean(row.discord_notifications_enabled),
    telegramChatId: row.telegram_chat_id ? String(row.telegram_chat_id) : null,
    telegramNotificationsEnabled: Boolean(row.telegram_notifications_enabled),
    emailNotificationsEnabled: Boolean(row.email_notifications_enabled),
    notificationEmail: row.notification_email ? String(row.notification_email) : null,
  };
}

module.exports = {
  DEFAULT_NOTIFICATION_SETTINGS,
  maskDiscordWebhookUrl,
  formatPublicNotificationSettings,
  sanitizeNotificationSettingsPatch,
  mapNotificationSettingsToRow,
  mapRowToNotificationSettings,
};
