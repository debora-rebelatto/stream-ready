const { userRepository, watchlistRepository, analyticsRepository } = require('../repositories');
const notifications = require('../../lib/notifications');

const SAMPLE_TEST_MOVIE = {
  id: 'tt15239678',
  name: 'Dune: Part Two',
  year: '2024',
  poster: 'https://images.metahub.space/poster/small/tt15239678/img',
  bestQuality: '4K UHD',
  audioFormat: 'Dolby Atmos',
  hasAtmos: true,
  streamCount: 18,
};

function createHttpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function getNotificationStatus(userId) {
  const settings = userRepository.getSettings(userId);
  const raw = userRepository.getRawNotificationSettings(userId);
  const availability = notifications.getNotificationChannelAvailability();

  return {
    settings: {
      notificationsEnabled: Boolean(settings.notificationsEnabled),
      discordNotificationsEnabled: Boolean(settings.discordNotificationsEnabled),
      discordWebhookUrl: settings.discordWebhookUrl || null,
      hasDiscordWebhook: Boolean(settings.hasDiscordWebhook),
      telegramNotificationsEnabled: Boolean(settings.telegramNotificationsEnabled),
      telegramChatId: settings.telegramChatId || null,
      emailNotificationsEnabled: Boolean(settings.emailNotificationsEnabled),
      notificationEmail: settings.notificationEmail || null,
    },
    accountEmail: raw?.email || null,
    availability,
  };
}

async function updateNotificationSettings({ userId, settings = {} }) {
  if (!userId) throw createHttpError('Unauthorized', 401);

  const patch = {};
  if (settings.notificationsEnabled !== undefined) {
    patch.notificationsEnabled = Boolean(settings.notificationsEnabled);
  }
  if (settings.discordNotificationsEnabled !== undefined) {
    patch.discordNotificationsEnabled = Boolean(settings.discordNotificationsEnabled);
  }
  if (settings.telegramNotificationsEnabled !== undefined) {
    patch.telegramNotificationsEnabled = Boolean(settings.telegramNotificationsEnabled);
  }
  if (settings.emailNotificationsEnabled !== undefined) {
    patch.emailNotificationsEnabled = Boolean(settings.emailNotificationsEnabled);
  }

  if (settings.discordWebhookUrl !== undefined) {
    const val = settings.discordWebhookUrl;
    if (val === null || val === '') {
      patch.discordWebhookUrl = null;
    } else if (typeof val === 'string' && !val.includes('••••••') && val !== '********') {
      if (!notifications.validateDiscordWebhookUrl(val)) {
        throw createHttpError(
          'Invalid Discord webhook URL. Expected https://discord.com/api/webhooks/...',
          400
        );
      }
      patch.discordWebhookUrl = val.trim();
    }
  }

  if (settings.telegramChatId !== undefined) {
    const val = settings.telegramChatId;
    if (val === null || val === '') {
      patch.telegramChatId = null;
    } else if (!notifications.validateTelegramChatId(val)) {
      throw createHttpError('Invalid Telegram Chat ID. Expected a numeric ID.', 400);
    } else {
      patch.telegramChatId = String(val).trim();
    }
  }

  if (settings.notificationEmail !== undefined) {
    const val = settings.notificationEmail;
    if (val === null || val === '') {
      patch.notificationEmail = null;
    } else if (!notifications.validateEmailAddress(val)) {
      throw createHttpError('Invalid email address.', 400);
    } else {
      patch.notificationEmail = val.trim().toLowerCase();
    }
  }

  await userRepository.updateSettings(patch, userId);
  return getNotificationStatus(userId);
}

function generateTelegramLink({ userId }) {
  if (!userId) throw createHttpError('Unauthorized', 401);

  const availability = notifications.getNotificationChannelAvailability();
  if (!availability.telegramBotConfigured || !availability.telegramBotUsername) {
    throw createHttpError(
      'Telegram bot is not configured on the server. Use manual Chat ID or configure TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME.',
      503
    );
  }

  const expiresInSeconds = 900;
  const token = notifications.createTelegramLinkToken(userId, expiresInSeconds);
  const deepLink = `https://t.me/${availability.telegramBotUsername}?start=${encodeURIComponent(token)}`;

  return {
    success: true,
    deepLink,
    botUsername: availability.telegramBotUsername,
    expiresInSeconds,
  };
}

async function unlinkTelegram({ userId }) {
  if (!userId) throw createHttpError('Unauthorized', 401);
  await userRepository.updateSettings(
    { telegramChatId: null, telegramNotificationsEnabled: false },
    userId
  );
  return getNotificationStatus(userId);
}

async function handleTelegramWebhook({ body, secretHeader }) {
  const expectedSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  if (expectedSecret && secretHeader !== expectedSecret) {
    throw createHttpError('Unauthorized webhook secret', 401);
  }

  const message = body?.message;
  const text = typeof message?.text === 'string' ? message.text.trim() : '';
  const chatId = message?.chat?.id !== undefined ? String(message.chat.id) : null;

  if (!chatId || !text.startsWith('/start')) {
    return { ok: true, ignored: true };
  }

  const parts = text.split(/\s+/);
  const token = parts[1] || '';
  if (!token) {
    await notifications.sendTelegramTextMessage(
      chatId,
      `👋 Welcome to <b>Stremio Watchlist</b>!\nYour Chat ID is: <code>${chatId}</code>\n\nUse the <b>Connect with Telegram</b> button in Settings or paste this Chat ID manually.`
    );
    return { ok: true, linked: false };
  }

  const verified = notifications.verifyTelegramLinkToken(token);
  if (!verified.valid || !verified.userId) {
    await notifications.sendTelegramTextMessage(
      chatId,
      '⚠️ This link has expired or is invalid. Please generate a new link from Settings → Notifications & Alerts.'
    );
    return { ok: true, linked: false, reason: verified.reason };
  }

  await userRepository.ensureLoaded();
  await userRepository.updateSettings(
    {
      notificationsEnabled: true,
      telegramChatId: chatId,
      telegramNotificationsEnabled: true,
    },
    verified.userId
  );

  await notifications.sendTelegramTextMessage(
    chatId,
    '✅ <b>Telegram connected!</b>\nYou will now receive automatic alerts here whenever your tracked movies become available in good quality.'
  );

  return { ok: true, linked: true, userId: verified.userId };
}

async function sendTestNotification({ userId, channel, baseUrl }) {
  if (!userId) throw createHttpError('Unauthorized', 401);
  if (!['telegram', 'discord', 'email'].includes(channel)) {
    throw createHttpError('Invalid notification channel', 400);
  }

  const raw = userRepository.getRawNotificationSettings(userId);
  if (!raw) throw createHttpError('User settings not found', 404);

  if (channel === 'telegram') {
    if (!raw.telegramChatId) {
      throw createHttpError('Connect Telegram or enter a Chat ID before sending a test.', 400);
    }
    return notifications.sendTelegramNotification({
      chatId: raw.telegramChatId,
      movie: SAMPLE_TEST_MOVIE,
      appUrl: baseUrl,
      isTest: true,
    });
  }

  if (channel === 'discord') {
    if (!raw.discordWebhookUrl) {
      throw createHttpError('Save a Discord webhook URL before sending a test.', 400);
    }
    return notifications.sendDiscordNotification({
      webhookUrl: raw.discordWebhookUrl,
      movie: SAMPLE_TEST_MOVIE,
      appUrl: baseUrl,
      isTest: true,
    });
  }

  const recipient = raw.notificationEmail || raw.email;
  if (!recipient) {
    throw createHttpError('Provide an email address before sending a test.', 400);
  }
  return notifications.sendEmailNotification({
    to: recipient,
    movie: SAMPLE_TEST_MOVIE,
    appUrl: baseUrl,
    isTest: true,
  });
}

async function notifyMovieReady({ userId, movie, baseUrl }) {
  if (!userId || !movie) return { sent: false, channels: [] };

  const raw = userRepository.getRawNotificationSettings(userId);
  if (!raw || !raw.notificationsEnabled) {
    return { sent: false, channels: [] };
  }

  const tasks = [];
  if (raw.telegramNotificationsEnabled && raw.telegramChatId) {
    tasks.push(
      notifications.sendTelegramNotification({
        chatId: raw.telegramChatId,
        movie,
        appUrl: baseUrl,
      })
    );
  }
  if (raw.discordNotificationsEnabled && raw.discordWebhookUrl) {
    tasks.push(
      notifications.sendDiscordNotification({
        webhookUrl: raw.discordWebhookUrl,
        movie,
        appUrl: baseUrl,
      })
    );
  }
  const emailTo = raw.notificationEmail || raw.email;
  if (raw.emailNotificationsEnabled && emailTo) {
    tasks.push(
      notifications.sendEmailNotification({
        to: emailTo,
        movie,
        appUrl: baseUrl,
      })
    );
  }

  if (tasks.length === 0) {
    return { sent: false, channels: [] };
  }

  const settled = await Promise.allSettled(tasks);
  const results = settled.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { success: false, channel: 'unknown', error: r.reason?.message || 'Unknown error' }
  );

  const succeededChannels = results.filter((r) => r.success).map((r) => r.channel);

  if (succeededChannels.length > 0) {
    await watchlistRepository.updateItem(
      movie.id,
      { notifiedAt: new Date().toISOString() },
      userId
    );
    analyticsRepository
      .recordAnalyticsEvent(
        'notification_sent',
        { movieId: movie.id, channels: succeededChannels, quality: movie.bestQuality || '' },
        userId
      )
      .catch(() => {});
  }

  return {
    sent: succeededChannels.length > 0,
    channels: succeededChannels,
    results,
  };
}

const notificationOperationService = {
  getNotificationStatus,
  updateNotificationSettings,
  generateTelegramLink,
  unlinkTelegram,
  handleTelegramWebhook,
  sendTestNotification,
  notifyMovieReady,
};

module.exports = { notificationOperationService };
