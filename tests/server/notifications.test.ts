import nodemailer from 'nodemailer';
import db from '../../lib/db';
import notifications from '../../lib/notifications';
import { maskDiscordWebhookUrl } from '../../lib/db/notificationSettingsHelper';
import { notificationOperationService } from '../../server/services/notificationOperationService';
import { registerNotificationRoutes } from '../../server/controllers/notificationController';
import { calculateNotificationMetrics } from '../../server/services/adminAnalyticsService';
import { runBackgroundCheck } from '../../server/utils/requestContext';

describe('Automated Notifications (Telegram, Discord, Email)', () => {
  const originalFetch = global.fetch;
  const savedEnv = { ...process.env };

  beforeEach(async () => {
    jest.spyOn(db, 'isSupabaseConfigured').mockReturnValue(false);
    await db.ensureLoaded();
    process.env.TELEGRAM_BOT_TOKEN = '123456:TEST_BOT_TOKEN';
    process.env.TELEGRAM_BOT_USERNAME = 'StremioWatchlistBot';
    process.env.TELEGRAM_WEBHOOK_SECRET = 'test-webhook-secret';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'alerts@example.com';
    process.env.SMTP_PASS = 'app-password';
    process.env.SMTP_FROM = 'Stremio Watchlist <alerts@example.com>';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...savedEnv };
    jest.restoreAllMocks();
  });

  describe('Validation, Masking & Telegram Deep-Link Tokens', () => {
    it('validates Discord webhook URLs and blocks SSRF targets', () => {
      expect(
        notifications.validateDiscordWebhookUrl(
          'https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz_0123456'
        )
      ).toBe(true);
      expect(
        notifications.validateDiscordWebhookUrl('http://127.0.0.1:7000/api/webhooks/1/abc')
      ).toBe(false);
      expect(
        notifications.validateDiscordWebhookUrl('https://evil.example.com/api/webhooks/1/abc')
      ).toBe(false);
    });

    it('masks Discord webhook URLs without exposing the full secret token', () => {
      const masked = maskDiscordWebhookUrl(
        'https://discord.com/api/webhooks/123456789/secretTokenValue987654'
      );
      expect(masked).toBe('https://discord.com/api/webhooks/123456789/••••••987654');
      expect(masked).not.toContain('secretToken');
    });

    it('validates Telegram Chat IDs and Email addresses', () => {
      expect(notifications.validateTelegramChatId('123456789')).toBe(true);
      expect(notifications.validateTelegramChatId('-1001234567890')).toBe(true);
      expect(notifications.validateTelegramChatId('not-a-number')).toBe(false);

      expect(notifications.validateEmailAddress('viewer@example.com')).toBe(true);
      expect(notifications.validateEmailAddress('invalid-email')).toBe(false);
    });

    it('creates and verifies stateless Telegram deep-link tokens within Telegram 64-char limit', () => {
      const userId = 'a1b2c3d4-e5f6-47a8-b9c0-1234567890ab';
      const token = notifications.createTelegramLinkToken(userId, 900);

      expect(token.length).toBeLessThanOrEqual(64);
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);

      const verified = notifications.verifyTelegramLinkToken(token);
      expect(verified).toEqual({ valid: true, userId });

      // Tampered token must fail
      const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
      expect(notifications.verifyTelegramLinkToken(tampered).valid).toBe(false);

      // Expired token must fail
      const expired = notifications.createTelegramLinkToken(userId, -10);
      expect(notifications.verifyTelegramLinkToken(expired)).toEqual({
        valid: false,
        reason: 'expired_token',
      });
    });
  });

  describe('Channel Dispatchers (Mocked Network & SMTP)', () => {
    const sampleMovie = {
      id: 'tt15239678',
      name: 'Dune: Part Two',
      year: '2024',
      poster: 'https://images.metahub.space/poster/small/tt15239678/img',
      bestQuality: '4K UHD',
      audioFormat: 'Dolby Atmos',
      streamCount: 18,
    };

    it('dispatches Telegram notification via Bot API', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"ok":true}',
      }) as any;

      const res = await notifications.sendTelegramNotification({
        chatId: '987654321',
        movie: sampleMovie,
      });

      expect(res).toEqual({ success: true, channel: 'telegram' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bot123456:TEST_BOT_TOKEN/sendMessage'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('dispatches Discord notification with rich embed', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => '',
      }) as any;

      const webhookUrl = 'https://discord.com/api/webhooks/123456789/ValidToken_123456789';
      const res = await notifications.sendDiscordNotification({
        webhookUrl,
        movie: sampleMovie,
      });

      expect(res).toEqual({ success: true, channel: 'discord' });
      expect(global.fetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('dispatches Email notification via Nodemailer SMTP and closes transporter', async () => {
      const sendMailMock = jest.fn().mockResolvedValue({ messageId: 'msg-1' });
      const closeMock = jest.fn();
      jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: sendMailMock,
        close: closeMock,
      } as any);

      const res = await notifications.sendEmailNotification({
        to: 'viewer@example.com',
        movie: sampleMovie,
      });

      expect(res).toEqual({ success: true, channel: 'email' });
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'viewer@example.com',
          subject: expect.stringContaining('Dune: Part Two'),
        })
      );
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Orchestration, Telegram Webhook Linking & Cron Deduplication', () => {
    it('links Telegram account via /start <token> webhook and rejects invalid secrets', async () => {
      const email = `tg_link_${Date.now()}@example.com`;
      const bucket = db.ensureUserBucket(email);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"ok":true}',
      }) as any;

      await expect(
        notificationOperationService.handleTelegramWebhook({
          body: { message: { text: '/start abc', chat: { id: 55512345 } } },
          secretHeader: 'wrong-secret',
        })
      ).rejects.toThrow(/Unauthorized/);

      const link = notificationOperationService.generateTelegramLink({ userId: bucket.id });
      const token = new URL(link.deepLink).searchParams.get('start');
      expect(token).toBeTruthy();

      const res = await notificationOperationService.handleTelegramWebhook({
        body: { message: { text: `/start ${token}`, chat: { id: 55512345 } } },
        secretHeader: 'test-webhook-secret',
      });

      expect(res).toEqual({ ok: true, linked: true, userId: bucket.id });
      const status = notificationOperationService.getNotificationStatus(bucket.id);
      expect(status.settings.telegramChatId).toBe('55512345');
      expect(status.settings.telegramNotificationsEnabled).toBe(true);
      expect(status.settings.notificationsEnabled).toBe(true);
    });

    it('triggers notification once during runBackgroundCheck and stamps notifiedAt to avoid duplicates', async () => {
      const email = `cron_notify_${Date.now()}@example.com`;
      const bucket = db.ensureUserBucket(email);

      const webhookUrl = 'https://discord.com/api/webhooks/111222333/TokenABC_12345678';
      await notificationOperationService.updateNotificationSettings({
        userId: bucket.id,
        settings: {
          notificationsEnabled: true,
          discordNotificationsEnabled: true,
          discordWebhookUrl: webhookUrl,
        },
      });

      await db.addItem(
        {
          id: 'tt9900112',
          name: 'Interstellar Remastered',
          year: '2025',
          has1080pPlus: false,
          bestQuality: 'CAM / Theater Rip',
          streamCount: 2,
        },
        bucket.id!
      );

      global.fetch = jest.fn().mockImplementation(async (url: string) => {
        if (String(url).includes('discord.com/api/webhooks')) {
          return { ok: true, status: 204, text: async () => '' };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            streams: [
              {
                name: 'Torrentio\n4k',
                title:
                  'Interstellar.Remastered.2025.2160p.WEB-DL.DDP5.1.Atmos.x265\n👤 140 💾 18.2 GB',
              },
            ],
          }),
          text: async () => '{}',
        };
      }) as any;

      const firstRun = await runBackgroundCheck();
      expect(firstRun.notificationsSentCount).toBeGreaterThanOrEqual(1);

      const updatedItem = db.getItem('tt9900112', bucket.id!);
      expect(updatedItem?.notifiedAt).toBeTruthy();

      const discordCallsAfterFirst = (global.fetch as jest.Mock).mock.calls.filter(([u]) =>
        String(u).includes('discord.com/api/webhooks')
      ).length;
      expect(discordCallsAfterFirst).toBe(1);

      // Second background check must not re-send notifications for already-ready/notified movie
      const secondRun = await runBackgroundCheck();
      expect(secondRun.notificationsSentCount).toBe(0);
      const discordCallsAfterSecond = (global.fetch as jest.Mock).mock.calls.filter(([u]) =>
        String(u).includes('discord.com/api/webhooks')
      ).length;
      expect(discordCallsAfterSecond).toBe(1);
    });

    it('rejects POST /api/notifications/test with 403 for non-admin users', async () => {
      const email = `regular_user_${Date.now()}@example.com`;
      const authKey = `auth_regular_${Date.now()}`;
      const bucket = db.ensureUserBucket(email);
      bucket.isAdmin = false;
      bucket.settings.stremioAuthKey = authKey;
      await db.resolveUser(authKey, () => ({ email }));

      const routes: Record<string, Function> = {};
      const mockApp = {
        get: (p: string, h: Function) => {
          routes[`GET ${p}`] = h;
        },
        post: (p: string, h: Function) => {
          routes[`POST ${p}`] = h;
        },
      };
      registerNotificationRoutes(mockApp);

      const handler = routes['POST /api/notifications/test'];
      expect(typeof handler).toBe('function');

      let statusCode = 200;
      let jsonBody: any = null;
      const mockRes = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: any) {
          jsonBody = body;
          return this;
        },
      };

      await handler(
        {
          headers: { 'x-stremio-auth': authKey },
          body: { channel: 'email' },
          get: () => 'localhost:7000',
          protocol: 'http',
        },
        mockRes
      );

      expect(statusCode).toBe(403);
      expect(jsonBody?.success).toBe(false);
    });

    it('aggregates notification adoption, sends, and link clicks per channel for Admin Analytics', () => {
      const users = [
        {
          id: 'u1',
          settings: {
            notificationsEnabled: true,
            emailNotificationsEnabled: true,
            telegramNotificationsEnabled: true,
            telegramChatId: '123456',
          },
        },
        {
          id: 'u2',
          settings: {
            notificationsEnabled: true,
            discordNotificationsEnabled: true,
            discordWebhookUrl: 'https://discord.com/api/webhooks/1/abc',
          },
        },
        {
          id: 'u3',
          settings: { notificationsEnabled: false, emailNotificationsEnabled: true },
        },
      ];
      const events = [
        { event_name: 'notification_sent', metadata: { channels: ['email', 'telegram'] } },
        { event_name: 'notification_sent', metadata: { channels: ['discord'] } },
        { event_name: 'notification_link_clicked', metadata: { channel: 'email' } },
      ];

      const metrics = calculateNotificationMetrics(users, events);
      expect(metrics).toEqual({
        enabledUsers: 2,
        enabledPercent: 67,
        emailUsers: 1,
        telegramUsers: 1,
        discordUsers: 1,
        sentTotal: 3,
        sentEmail: 1,
        sentTelegram: 1,
        sentDiscord: 1,
        clickedTotal: 1,
        clickedEmail: 1,
        clickedTelegram: 0,
        clickedDiscord: 0,
      });
    });
  });
});
