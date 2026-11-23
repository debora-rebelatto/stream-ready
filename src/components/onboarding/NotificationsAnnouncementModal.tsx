import React from 'react';
import { Bell, Mail, MessageSquare, Send, ArrowRight } from 'lucide-react';
import { safeStorage } from '../../utils';
import { Badge, Button, ModalShell } from '../common';

export const NOTIFICATIONS_ANNOUNCEMENT_SEEN_KEY = 'stremio_notifications_announcement_v1_seen';

function buildScopedKey(userKey?: string | null): string {
  return userKey
    ? `${NOTIFICATIONS_ANNOUNCEMENT_SEEN_KEY}:${userKey.toLowerCase().trim()}`
    : NOTIFICATIONS_ANNOUNCEMENT_SEEN_KEY;
}

export function hasSeenNotificationsAnnouncement(userKey?: string | null): boolean {
  return safeStorage.get(buildScopedKey(userKey)) === 'true';
}

export function markNotificationsAnnouncementSeen(userKey?: string | null): void {
  safeStorage.set(buildScopedKey(userKey), 'true');
}

export interface NotificationsAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigureNow: () => void;
}

export const NotificationsAnnouncementModal: React.FC<NotificationsAnnouncementModalProps> = ({
  isOpen,
  onClose,
  onConfigureNow,
}) => {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-lg"
      icon={
        <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
          <Bell size={18} />
        </div>
      }
      title={
        <span className="inline-flex items-center gap-2">
          <span>Automated Release Alerts</span>
          <Badge variant="emerald" size="xs" uppercase>
            New
          </Badge>
        </span>
      }
      subtitle="Get notified automatically when tracked movies drop in good quality"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Maybe Later
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfigureNow}
            icon={<ArrowRight size={14} />}
            iconPosition="right"
          >
            Configure Notifications
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
        <p>
          You no longer need to check your watchlist manually. Whenever our background tracker
          detects a verified release matching your quality &amp; audio preferences, we&apos;ll send
          you a single alert with direct links to watch in Stremio.
        </p>

        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
            <Send size={15} className="text-sky-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">Telegram Bot (2-click setup)</p>
              <p className="text-gray-400">
                Click <strong>Connect with Telegram</strong> and press <strong>Start</strong> in the
                bot — no tokens or IDs needed.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
            <Mail size={15} className="text-purple-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">Email Alerts</p>
              <p className="text-gray-400">
                Toggle Email alerts on using your Stremio account email or any custom address.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
            <MessageSquare size={15} className="text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">Discord Webhook</p>
              <p className="text-gray-400">
                Paste a channel webhook URL from{' '}
                <strong>Server Settings → Integrations → Webhooks</strong> for rich movie embeds.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          You can enable, pause, or customize channels anytime under{' '}
          <strong className="text-purple-300">Settings → Notifications &amp; Alerts</strong>.
        </p>
      </div>
    </ModalShell>
  );
};
