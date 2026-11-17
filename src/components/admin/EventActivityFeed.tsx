import React from 'react';
import { Activity, Clock } from 'lucide-react';
import type { EventBreakdownMetric, RecentEventMetric } from '../../models';

interface EventActivityFeedProps {
  eventsBreakdown: EventBreakdownMetric[];
  recentEvents: RecentEventMetric[];
}

export const EventActivityFeed: React.FC<EventActivityFeedProps> = ({
  eventsBreakdown,
  recentEvents,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Event Breakdown */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Telemetry Events Breakdown
            </h3>
            <p className="text-xs text-gray-400">Total occurrences by action type.</p>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {eventsBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400">No events logged.</p>
          ) : (
            eventsBreakdown.map((ev) => (
              <div
                key={ev.eventName}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c2032] border border-white/5 text-xs"
              >
                <span className="font-mono text-gray-300 font-medium">{ev.eventName}</span>
                <span className="font-bold text-white bg-white/5 px-2 py-0.5 rounded">
                  {ev.count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity Stream */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Live Event Feed
            </h3>
            <p className="text-xs text-gray-400">Latest user interactions.</p>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {recentEvents.length === 0 ? (
            <p className="text-xs text-gray-400">No recent activity.</p>
          ) : (
            recentEvents.map((ev, index) => {
              const formattedTime = ev.createdAt
                ? new Date(ev.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent';

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#1c2032] border border-white/5 text-xs"
                >
                  <span className="font-mono text-purple-300 truncate max-w-60">
                    {ev.eventName}
                  </span>
                  <span className="text-[11px] text-gray-400 font-mono shrink-0 ml-2">
                    {formattedTime}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
