import React from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { useNotificationsController } from '../../controllers/useNotificationsController';
import { Switch, Badge } from '../common';
import { TelegramChannelCard } from './TelegramChannelCard';
import { DiscordChannelCard } from './DiscordChannelCard';
import { EmailChannelCard } from './EmailChannelCard';

export const NotificationsSettingsCard: React.FC = () => {
  const {
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
  } = useNotificationsController();

  const isDisabled = !user || isLoading;

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Bell size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Automated Release Notifications
            </h2>
            <p className="text-xs text-gray-400">
              Get notified automatically during background checks when tracked movies meet your
              quality &amp; audio criteria.
            </p>
          </div>
        </div>

        <Switch
          checked={preferences.notificationsEnabled}
          onChange={handleToggleMaster}
          disabled={isDisabled || isSaving}
          title="Toggle automated release notifications"
          label="Enable Automated Release Alerts"
          badge={
            <Badge variant={preferences.notificationsEnabled ? 'emerald' : 'neutral'} size="xs" uppercase>
              {preferences.notificationsEnabled ? 'Active' : 'Paused'}
            </Badge>
          }
          description="Sends a single alert per movie when a background check detects a new release matching your target quality. Manual UI rechecks will not trigger duplicate alerts."
        />

        {!user && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={13} className="shrink-0" />
            <span>Please sign in with your Stremio account to configure notifications.</span>
          </p>
        )}
      </div>

      <TelegramChannelCard
        disabled={isDisabled}
        enabled={preferences.telegramNotificationsEnabled}
        chatId={preferences.telegramChatId}
        chatIdInput={telegramChatIdInput}
        setChatIdInput={setTelegramChatIdInput}
        botConfigured={availability.telegramBotConfigured}
        botUsername={availability.telegramBotUsername}
        isLinking={isLinkingTelegram}
        awaitingLink={awaitingTelegramLink}
        isSaving={isSaving}
        isTesting={testingChannel === 'telegram'}
        onToggle={handleToggleTelegram}
        onConnect={handleConnectTelegram}
        onSaveChatId={handleSaveTelegramChatId}
        onUnlink={handleUnlinkTelegram}
        onRefresh={loadStatus}
        onTest={() => handleSendTest('telegram')}
      />

      <DiscordChannelCard
        disabled={isDisabled}
        enabled={preferences.discordNotificationsEnabled}
        hasWebhook={preferences.hasDiscordWebhook}
        maskedWebhook={preferences.discordWebhookUrl}
        webhookInput={discordInput}
        setWebhookInput={setDiscordInput}
        isSaving={isSaving}
        isTesting={testingChannel === 'discord'}
        onToggle={handleToggleDiscord}
        onSaveWebhook={handleSaveDiscordWebhook}
        onClearWebhook={handleClearDiscordWebhook}
        onTest={() => handleSendTest('discord')}
      />

      <EmailChannelCard
        disabled={isDisabled}
        enabled={preferences.emailNotificationsEnabled}
        smtpConfigured={availability.smtpConfigured}
        accountEmail={accountEmail}
        emailInput={emailInput}
        setEmailInput={setEmailInput}
        isSaving={isSaving}
        isTesting={testingChannel === 'email'}
        onToggle={handleToggleEmail}
        onSaveEmail={handleSaveEmail}
        onTest={() => handleSendTest('email')}
      />
    </div>
  );
};
