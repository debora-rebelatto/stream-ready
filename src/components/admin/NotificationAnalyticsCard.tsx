import React from 'react';
import { Bell, Mail, MessageSquare, Send } from 'lucide-react';
import type { ServiceAdoptionMetrics } from '../../models';

interface NotificationAnalyticsCardProps {
  notifications: NonNullable<ServiceAdoptionMetrics['notifications']>;
}

export const NotificationAnalyticsCard: React.FC<NotificationAnalyticsCardProps> = ({
  notifications,
}) => {
  const channels = [
    {
      id: 'email',
      label: 'Email (SMTP)',
      icon: <Mail size={15} className="text-purple-400" />,
      users: notifications.emailUsers,
      sent: notifications.sentEmail,
      clicked: notifications.clickedEmail,
    },
    {
      id: 'telegram',
      label: 'Telegram Bot',
      icon: <Send size={15} className="text-sky-400" />,
      users: notifications.telegramUsers,
      sent: notifications.sentTelegram,
      clicked: notifications.clickedTelegram,
    },
    {
      id: 'discord',
      label: 'Discord Webhook',
      icon: <MessageSquare size={15} className="text-indigo-400" />,
      users: notifications.discordUsers,
      sent: notifications.sentDiscord,
      clicked: notifications.clickedDiscord,
    },
  ];

  return (
    <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Bell size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Automated Notifications &amp; Email Analytics
            </h3>
            <p className="text-xs text-gray-400">
              Channel adoption, alerts dispatched, and watchlist link clicks.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-300">
            Active Users:{' '}
            <strong className="text-emerald-400">
              {notifications.enabledUsers} ({notifications.enabledPercent}%)
            </strong>
          </span>
          <span className="text-gray-300">
            Total Sent: <strong className="text-white">{notifications.sentTotal}</strong>
          </span>
          <span className="text-gray-300">
            Clicks: <strong className="text-purple-300">{notifications.clickedTotal}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className="p-4 rounded-xl bg-[#1c2032] border border-white/5 space-y-2.5"
          >
            <div className="flex items-center gap-2">
              {ch.icon}
              <span className="text-xs font-bold text-white">{ch.label}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-lg bg-black/25">
                <div className="text-sm font-bold text-white">{ch.users}</div>
                <div className="text-[10px] text-gray-400">Users</div>
              </div>
              <div className="p-2 rounded-lg bg-black/25">
                <div className="text-sm font-bold text-emerald-300">{ch.sent}</div>
                <div className="text-[10px] text-gray-400">Sent</div>
              </div>
              <div className="p-2 rounded-lg bg-black/25">
                <div className="text-sm font-bold text-purple-300">{ch.clicked}</div>
                <div className="text-[10px] text-gray-400">Clicks</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
