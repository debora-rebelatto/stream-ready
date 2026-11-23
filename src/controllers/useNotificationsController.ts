import { useCallback, useEffect, useState } from 'react';
import type {
  NotificationChannel,
  NotificationChannelAvailability,
  NotificationPreferences,
} from '../models';
import { notificationService } from '../services';
import { useAuth, useToast } from '../context/useAppContext';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  notificationsEnabled: false,
  discordNotificationsEnabled: false,
  discordWebhookUrl: null,
  hasDiscordWebhook: false,
  telegramNotificationsEnabled: false,
  telegramChatId: null,
  emailNotificationsEnabled: false,
  notificationEmail: null,
};

const DEFAULT_AVAILABILITY: NotificationChannelAvailability = {
  telegramBotConfigured: false,
  telegramBotUsername: null,
  smtpConfigured: false,
  discordSupported: true,
};

export function useNotificationsController() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [availability, setAvailability] =
    useState<NotificationChannelAvailability>(DEFAULT_AVAILABILITY);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<NotificationChannel | null>(null);
  const [isLinkingTelegram, setIsLinkingTelegram] = useState(false);
  const [awaitingTelegramLink, setAwaitingTelegramLink] = useState(false);

  const [discordInput, setDiscordInput] = useState('');
  const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const applyResponse = useCallback(
    (data: {
      settings?: NotificationPreferences;
      availability?: NotificationChannelAvailability;
      accountEmail?: string | null;
    }) => {
      if (data.settings) {
        setPreferences(data.settings);
        setTelegramChatIdInput(data.settings.telegramChatId || '');
        setEmailInput(data.settings.notificationEmail || data.accountEmail || '');
        if (data.settings.telegramChatId) {
          setAwaitingTelegramLink(false);
        }
      }
      if (data.availability) {
        setAvailability(data.availability);
      }
      if (data.accountEmail !== undefined) {
        setAccountEmail(data.accountEmail);
      }
    },
    []
  );

  const loadStatus = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await notificationService.getStatus();
      applyResponse(data);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load notification settings.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, applyResponse, showToast]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!awaitingTelegramLink) return;
    const onFocus = () => {
      loadStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [awaitingTelegramLink, loadStatus]);

  const savePatch = useCallback(
    async (patch: Partial<NotificationPreferences>, successMessage: string) => {
      if (!user) return false;
      setIsSaving(true);
      try {
        const res = await notificationService.saveSettings(patch);
        applyResponse(res);
        showToast(successMessage, 'success');
        return true;
      } catch (err: any) {
        showToast(err?.message || 'Failed to save notification settings.', 'error');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user, applyResponse, showToast]
  );

  const handleToggleMaster = (enabled: boolean) =>
    savePatch(
      { notificationsEnabled: enabled },
      enabled ? 'Automated release notifications enabled.' : 'Automated release notifications paused.'
    );

  const handleToggleDiscord = (enabled: boolean) =>
    savePatch(
      { discordNotificationsEnabled: enabled },
      enabled ? 'Discord alerts enabled.' : 'Discord alerts disabled.'
    );

  const handleSaveDiscordWebhook = async () => {
    const trimmed = discordInput.trim();
    if (!trimmed) {
      showToast('Please enter a valid Discord webhook URL.', 'error');
      return;
    }
    const ok = await savePatch(
      {
        discordWebhookUrl: trimmed,
        discordNotificationsEnabled: true,
        notificationsEnabled: true,
      },
      'Discord webhook saved and enabled!'
    );
    if (ok) setDiscordInput('');
  };

  const handleClearDiscordWebhook = () =>
    savePatch(
      { discordWebhookUrl: null, discordNotificationsEnabled: false },
      'Discord webhook removed.'
    );

  const handleToggleTelegram = (enabled: boolean) =>
    savePatch(
      { telegramNotificationsEnabled: enabled },
      enabled ? 'Telegram alerts enabled.' : 'Telegram alerts disabled.'
    );

  const handleConnectTelegram = async () => {
    if (!user) return;
    setIsLinkingTelegram(true);
    try {
      const res = await notificationService.createTelegramLink();
      if (res.deepLink) {
        setAwaitingTelegramLink(true);
        window.open(res.deepLink, '_blank', 'noopener,noreferrer');
        showToast('Telegram opened! Press Start in the bot, then return here.', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to generate Telegram link.', 'error');
    } finally {
      setIsLinkingTelegram(false);
    }
  };

  const handleSaveTelegramChatId = () => {
    const trimmed = telegramChatIdInput.trim();
    return savePatch(
      {
        telegramChatId: trimmed || null,
        telegramNotificationsEnabled: Boolean(trimmed),
        notificationsEnabled: trimmed ? true : preferences.notificationsEnabled,
      },
      trimmed ? 'Telegram Chat ID saved!' : 'Telegram Chat ID cleared.'
    );
  };

  const handleUnlinkTelegram = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await notificationService.unlinkTelegram();
      applyResponse(res);
      showToast('Telegram disconnected.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to disconnect Telegram.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEmail = (enabled: boolean) =>
    savePatch(
      { emailNotificationsEnabled: enabled },
      enabled ? 'Email alerts enabled.' : 'Email alerts disabled.'
    );

  const handleSaveEmail = () =>
    savePatch(
      {
        notificationEmail: emailInput.trim() || null,
        emailNotificationsEnabled: true,
        notificationsEnabled: true,
      },
      'Notification email saved!'
    );

  const handleSendTest = async (channel: NotificationChannel) => {
    if (!user) return;
    setTestingChannel(channel);
    try {
      const res = await notificationService.sendTest(channel);
      if (res.success) {
        showToast(`Test alert sent via ${channel}!`, 'success');
      } else {
        showToast(res.error || `Failed to send ${channel} test alert.`, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || `Failed to send ${channel} test alert.`, 'error');
    } finally {
      setTestingChannel(null);
    }
  };

  return {
    user,
    preferences,
    availability,
    accountEmail,
    isLoading,
    isSaving,
    testingChannel,
    isLinkingTelegram,
    awaitingTelegramLink,
    discordInput,
    setDiscordInput,
    telegramChatIdInput,
    setTelegramChatIdInput,
    emailInput,
    setEmailInput,
    loadStatus,
    handleToggleMaster,
    handleToggleDiscord,
    handleSaveDiscordWebhook,
    handleClearDiscordWebhook,
    handleToggleTelegram,
    handleConnectTelegram,
    handleSaveTelegramChatId,
    handleUnlinkTelegram,
    handleToggleEmail,
    handleSaveEmail,
    handleSendTest,
  };
}
