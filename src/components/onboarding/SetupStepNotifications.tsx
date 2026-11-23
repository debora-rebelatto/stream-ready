import React from 'react';
import { Bell, CheckCircle2, ExternalLink, Mail, MessageSquare, Send } from 'lucide-react';
import { useNotificationsController } from '../../controllers/useNotificationsController';
import { Badge, Button, Switch } from '../common';

export const SetupStepNotifications: React.FC = () => {
  const {
    user,
    preferences,
    availability,
    accountEmail,
    isLoading,
    isSaving,
    isLinkingTelegram,
    awaitingTelegramLink,
    discordInput,
    setDiscordInput,
    loadStatus,
    handleConnectTelegram,
    handleToggleEmail,
    handleSaveDiscordWebhook,
  } = useNotificationsController();

  const isDisabled = !user || isLoading;
  const telegramConnected = Boolean(preferences.telegramChatId);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
          <Bell size={18} />
        </div>
        <div className="text-xs text-gray-300 leading-relaxed">
          <p className="font-bold text-white mb-0.5">Optional: Never miss a digital release</p>
          <p>
            Choose one or more channels below. Background checks will alert you once per movie as
            soon as it matches your quality &amp; audio preferences. You can change this anytime in{' '}
            <strong className="text-purple-200">Settings → Notifications &amp; Alerts</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#151824] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Send size={15} className="text-sky-400" />
              <h3 className="text-sm font-bold text-white">Telegram Bot</h3>
            </div>
            {telegramConnected && (
              <Badge variant="emerald" size="xs">
                Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Instant push notifications on mobile &amp; desktop in 2 clicks.
          </p>
          {telegramConnected ? (
            <div className="flex items-center gap-2 text-xs text-emerald-300 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 size={14} />
              <span>Telegram alerts active</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectTelegram}
                isLoading={isLinkingTelegram}
                disabled={isDisabled || !availability.telegramBotConfigured}
                icon={<ExternalLink size={13} />}
              >
                Connect with Telegram
              </Button>
              {awaitingTelegramLink && (
                <Button variant="outline" size="sm" onClick={loadStatus}>
                  Check Connection
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#151824] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white">Email Alerts</h3>
            </div>
            <Switch
              checked={preferences.emailNotificationsEnabled && preferences.notificationsEnabled}
              onChange={handleToggleEmail}
              disabled={isDisabled || isSaving || !accountEmail}
              title="Toggle email alerts"
              label=""
            />
          </div>
          <p className="text-xs text-gray-400">
            Receive clean release alerts at{' '}
            <strong className="text-gray-200">{accountEmail || 'your account email'}</strong>.
          </p>
        </div>
      </div>

      <div className="bg-[#151824] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Discord Webhook</h3>
          </div>
          {preferences.hasDiscordWebhook && (
            <Badge variant="emerald" size="xs">
              Saved
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Paste a Discord channel webhook URL (<strong>Server Settings → Integrations → Webhooks</strong>).
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={discordInput}
            onChange={(e) => setDiscordInput(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            disabled={isDisabled || isSaving}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDiscordWebhook}
            isLoading={isSaving}
            disabled={isDisabled || !discordInput.trim()}
          >
            Save Webhook
          </Button>
        </div>
      </div>
    </div>
  );
};
