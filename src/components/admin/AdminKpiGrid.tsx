import React from 'react';
import { Users, Film, CheckCircle, Clock, Eye } from 'lucide-react';
import type { KpiMetrics } from '../../models';

interface AdminKpiGridProps {
  kpis: KpiMetrics;
}

export const AdminKpiGrid: React.FC<AdminKpiGridProps> = ({ kpis }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* Total Users */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-2">
          <Users size={16} />
          <span>Total Users</span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-white">{kpis.totalUsers}</div>
        <div className="text-[11px] text-gray-400 mt-1">Registered accounts</div>
      </div>

      {/* Active Users */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Users</span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-emerald-300">{kpis.activeUsers24h}</div>
        <div className="text-[11px] text-gray-400 mt-1">
          7d: <strong className="text-gray-200">{kpis.activeUsers7d}</strong> • 30d:{' '}
          <strong className="text-gray-200">{kpis.activeUsers30d}</strong>
        </div>
      </div>

      {/* Total Movies Tracked */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold mb-2">
          <Film size={16} />
          <span>Watchlist Movies</span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-white">{kpis.totalWatchlistItems}</div>
        <div className="text-[11px] text-gray-400 mt-1">
          Avg <strong className="text-gray-200">{kpis.avgMoviesPerUser}</strong> per user
          {typeof kpis.totalTrackedItems === 'number' && (
            <span className="block text-gray-400 text-[10px] mt-0.5">
              ({kpis.totalTrackedItems} total tracked incl. watched)
            </span>
          )}
        </div>
      </div>

      {/* Ready Quality */}
      <div className="bg-[#151824] border border-emerald-500/20 bg-emerald-500/5 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-2">
          <CheckCircle size={16} />
          <span>Ready (Good Quality)</span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-emerald-300">
          {kpis.readyWatchlistItems}
        </div>
        <div className="text-[11px] text-emerald-400/80 mt-1">Quality confirmed</div>
      </div>

      {/* Waiting for Quality */}
      <div className="bg-[#151824] border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-2">
          <Clock size={16} />
          <span>Waiting Release</span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-amber-300">
          {kpis.waitingWatchlistItems}
        </div>
        <div className="text-[11px] text-amber-400/80 mt-1">Scanning for HD/4K</div>
      </div>

      {/* Watched Movies */}
      <div className="bg-[#151824] border border-purple-500/20 bg-purple-500/5 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-2">
          <Eye size={16} />
          <span>Watched</span>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-purple-300">
          {kpis.watchedWatchlistItems}
        </div>
        <div className="text-[11px] text-purple-400/80 mt-1">Archived after viewing</div>
      </div>
    </div>
  );
};
