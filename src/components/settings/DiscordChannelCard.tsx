import React from 'react';
import { Send, Trash2, CheckCircle2 } from 'lucide-react';
import { Button, Switch, Badge } from '../common';

export interface DiscordChannelCardProps {
  disabled: boolean;
  enabled: boolean;
  hasWebhook: boolean;
  maskedWebhook: string | null;
  webhookInput: string;
  setWebhookInput: (val: string) => void;
  isSaving: boolean;
  isTesting: boolean;
  canTest?: boolean;
  onToggle: (enabled: boolean) => void;
  onSaveWebhook: () => void;
  onClearWebhook: () => void;
  onTest: () => void;
}

export const DiscordChannelCard: React.FC<DiscordChannelCardProps> = ({
  disabled,
  enabled,
  hasWebhook,
  maskedWebhook,
  webhookInput,
  setWebhookInput,
  isSaving,
  isTesting,
  canTest = false,
  onToggle,
  onSaveWebhook,
  onClearWebhook,
  onTest,
}) => {
  return (
    <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Discord Webhook</h3>
            {hasWebhook && (
              <Badge variant="emerald" size="xs">
                Saved
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Post rich movie release embeds to your personal or community Discord channel.
          </p>
        </div>
        <Switch
          checked={enabled}
          onChange={onToggle}
          disabled={disabled || !hasWebhook || isSaving}
          title="Toggle Discord alerts"
          label=""
        />
      </div>

      {hasWebhook && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-300 min-w-0">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span className="font-mono truncate">{maskedWebhook}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canTest && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTest}
                isLoading={isTesting}
                disabled={disabled}
                icon={<Send size={12} />}
              >
                Send Test
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearWebhook}
              disabled={disabled || isSaving}
              icon={<Trash2 size={12} />}
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="url"
          value={webhookInput}
          onChange={(e) => setWebhookInput(e.target.value)}
          placeholder={
            hasWebhook
              ? 'Paste a new Discord Webhook URL to replace...'
              : 'https://discord.com/api/webhooks/...'
          }
          disabled={disabled || isSaving}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={onSaveWebhook}
          isLoading={isSaving}
          disabled={disabled || !webhookInput.trim()}
        >
          {hasWebhook ? 'Update Webhook' : 'Save Webhook'}
        </Button>
      </div>
      <p className="text-[11px] text-gray-500">
        Create one in Discord via <strong>Server Settings → Integrations → Webhooks</strong>. Stored
        encrypted with AES-256-GCM.
      </p>
    </div>
  );
};
