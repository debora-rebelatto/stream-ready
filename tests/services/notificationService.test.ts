import { notificationService } from '../../src/services/notificationService';
import { api } from '../../src/utils/httpClient';

describe('notificationService (Frontend Service Layer)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates status, settings, test, and telegram link calls to api', async () => {
    const statusSpy = jest.spyOn(api, 'getNotificationStatus').mockResolvedValue({
      settings: {
        notificationsEnabled: true,
        discordNotificationsEnabled: false,
        discordWebhookUrl: null,
        hasDiscordWebhook: false,
        telegramNotificationsEnabled: true,
        telegramChatId: '123456789',
        emailNotificationsEnabled: false,
        notificationEmail: null,
      },
      accountEmail: 'user@example.com',
      availability: {
        telegramBotConfigured: true,
        telegramBotUsername: 'StremioWatchlistBot',
        smtpConfigured: true,
        discordSupported: true,
      },
    });

    const saveSpy = jest.spyOn(api, 'saveNotificationSettings').mockResolvedValue({
      success: true,
    });
    const testSpy = jest.spyOn(api, 'testNotification').mockResolvedValue({
      success: true,
      channel: 'telegram',
    });
    const linkSpy = jest.spyOn(api, 'createTelegramLink').mockResolvedValue({
      success: true,
      deepLink: 'https://t.me/StremioWatchlistBot?start=tok',
    });
    const unlinkSpy = jest.spyOn(api, 'unlinkTelegram').mockResolvedValue({
      success: true,
    });

    const status = await notificationService.getStatus();
    expect(status.settings.telegramChatId).toBe('123456789');
    expect(statusSpy).toHaveBeenCalledTimes(1);

    await notificationService.saveSettings({ notificationsEnabled: false });
    expect(saveSpy).toHaveBeenCalledWith({ notificationsEnabled: false });

    const testRes = await notificationService.sendTest('telegram');
    expect(testRes.success).toBe(true);
    expect(testSpy).toHaveBeenCalledWith('telegram');

    const linkRes = await notificationService.createTelegramLink();
    expect(linkRes.deepLink).toContain('t.me/StremioWatchlistBot');
    expect(linkSpy).toHaveBeenCalledTimes(1);

    await notificationService.unlinkTelegram();
    expect(unlinkSpy).toHaveBeenCalledTimes(1);
  });
});
