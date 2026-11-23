import React, { useState } from 'react';
import { Send, ExternalLink, Unlink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Button, Switch, Badge } from '../common';

export interface TelegramChannelCardProps {
  disabled: boolean;
  enabled: boolean;
  chatId: string | null;
  chatIdInput: string;
  setChatIdInput: (val: string) => void;
  botConfigured: boolean;
  botUsername: string | null;
  isLinking: boolean;
  awaitingLink: boolean;
  isSaving: boolean;
  isTesting: boolean;
  onToggle: (enabled: boolean) => void;
  onConnect: () => void;
  onSaveChatId: () => void;
  onUnlink: () => void;
  onRefresh: () => void;
  onTest: () => void;
}

export const TelegramChannelCard: React.FC<TelegramChannelCardProps> = ({
  disabled,
  enabled,
  chatId,
  chatIdInput,
  setChatIdInput,
  botConfigured,
  botUsername,
  isLinking,
  awaitingLink,
  isSaving,
  isTesting,
  onToggle,
  onConnect,
  onSaveChatId,
  onUnlink,
  onRefresh,
  onTest,
}) => {
  const [showManual, setShowManual] = useState(false);
  const isConnected = Boolean(chatId);

  return (
    <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Telegram Bot</h3>
            {isConnected ? (
              <Badge variant="emerald" size="xs">
                Connected
              </Badge>
            ) : !botConfigured ? (
              <Badge variant="amber" size="xs">
                Bot Not Configured
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Instant mobile and desktop push alerts via Telegram
            {botUsername ? ` (@${botUsername})` : ''}.
          </p>
        </div>
        <Switch
          checked={enabled}
          onChange={onToggle}
          disabled={disabled || !isConnected || isSaving}
          title="Toggle Telegram alerts"
          label=""
        />
      </div>

      {isConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 size={14} />
            <span>
              Linked Chat ID: <strong className="font-mono">{chatId}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              isLoading={isTesting}
              disabled={disabled || !botConfigured}
              icon={<Send size={12} />}
            >
              Send Test
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnlink}
              disabled={disabled || isSaving}
              icon={<Unlink size={12} />}
            >
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onConnect}
              isLoading={isLinking}
              disabled={disabled || !botConfigured || !botUsername}
              icon={<ExternalLink size={13} />}
            >
              Connect with Telegram
            </Button>
            {awaitingLink && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                icon={<RefreshCw size={12} />}
              >
                Check Connection
              </Button>
            )}
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="text-xs text-purple-300 hover:text-purple-200 underline cursor-pointer ml-auto"
            >
              {showManual ? 'Hide manual Chat ID' : 'Enter Chat ID manually'}
            </button>
          </div>

          {showManual && (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="Numeric Telegram Chat ID (e.g. 123456789)"
                disabled={disabled || isSaving}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveChatId}
                isLoading={isSaving}
                disabled={disabled || !chatIdInput.trim()}
              >
                Save Chat ID
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
