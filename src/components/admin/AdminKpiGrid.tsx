import React from 'react';
import { Users, Film, CheckCircle, Clock, Eye } from 'lucide-react';
import type { KpiMetrics } from '../../models';
import { StatCard } from '../common';

interface AdminKpiGridProps {
  kpis: KpiMetrics;
}

export const AdminKpiGrid: React.FC<AdminKpiGridProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      <StatCard
        theme="purple"
        icon={<Users size={16} />}
        label="Total Users"
        value={kpis.totalUsers}
        subtitle="Registered accounts"
      />

      <StatCard
        theme="emerald"
        pulseDot
        label="Active Users"
        value={kpis.activeUsers24h}
        subtitle={
          <>
            7d: <strong className="text-gray-200">{kpis.activeUsers7d}</strong> • 30d:{' '}
            <strong className="text-gray-200">{kpis.activeUsers30d}</strong>
          </>
        }
      />

      <StatCard
        theme="blue"
        icon={<Film size={16} />}
        label="Watchlist Movies"
        value={kpis.totalWatchlistItems}
        subtitle={
          <>
            Avg <strong className="text-gray-200">{kpis.avgMoviesPerUser}</strong> per user
            {typeof kpis.totalTrackedItems === 'number' && (
              <span className="block text-gray-400 text-[10px] mt-0.5">
                ({kpis.totalTrackedItems} total tracked incl. watched)
              </span>
            )}
          </>
        }
      />

      <StatCard
        theme="emerald"
        icon={<CheckCircle size={16} />}
        label="Ready (Good Quality)"
        value={kpis.readyWatchlistItems}
        subtitle={<span className="text-emerald-400/80">Quality confirmed</span>}
      />

      <StatCard
        theme="amber"
        icon={<Clock size={16} />}
        label="Waiting Release"
        value={kpis.waitingWatchlistItems}
        subtitle={<span className="text-amber-400/80">Scanning for HD/4K</span>}
      />

      <StatCard
        theme="purple"
        icon={<Eye size={16} />}
        label="Watched"
        value={kpis.watchedWatchlistItems}
        subtitle={<span className="text-purple-400/80">Archived after viewing</span>}
      />
    </div>
  );
};

