import React from 'react';
import { Send } from 'lucide-react';
import { Button, Switch, Badge } from '../common';

export interface EmailChannelCardProps {
  disabled: boolean;
  enabled: boolean;
  smtpConfigured: boolean;
  accountEmail: string | null;
  emailInput: string;
  setEmailInput: (val: string) => void;
  isSaving: boolean;
  isTesting: boolean;
  onToggle: (enabled: boolean) => void;
  onSaveEmail: () => void;
  onTest: () => void;
}

export const EmailChannelCard: React.FC<EmailChannelCardProps> = ({
  disabled,
  enabled,
  smtpConfigured,
  accountEmail,
  emailInput,
  setEmailInput,
  isSaving,
  isTesting,
  onToggle,
  onSaveEmail,
  onTest,
}) => {
  const effectiveEmail = emailInput.trim() || accountEmail || '';

  return (
    <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Email Alerts (SMTP)</h3>
            {!smtpConfigured && (
              <Badge variant="amber" size="xs">
                SMTP Not Configured
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Receive clean release notifications in your inbox whenever a movie is ready.
          </p>
        </div>
        <Switch
          checked={enabled}
          onChange={onToggle}
          disabled={disabled || !effectiveEmail || isSaving}
          title="Toggle email alerts"
          label=""
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder={accountEmail || 'you@example.com'}
          disabled={disabled || isSaving}
          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={onSaveEmail}
          isLoading={isSaving}
          disabled={disabled || !effectiveEmail}
        >
          Save Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          isLoading={isTesting}
          disabled={disabled || !smtpConfigured || !effectiveEmail}
          icon={<Send size={12} />}
        >
          Send Test
        </Button>
      </div>

      {!smtpConfigured && (
        <p className="text-[11px] text-amber-400/90">
          SMTP credentials (<code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>)
          must be configured on the server to deliver emails.
        </p>
      )}
    </div>
  );
};
