import React from 'react';
import {
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useAdminController, type AdminTimeRange } from '../controllers/useAdminController';
import { Button } from '../components';
import {
  AdminKpiGrid,
  ServiceAdoptionCard,
  TopMoviesTable,
  PollFeedbackCard,
} from '../components/admin';

export interface AdminDashboardViewProps {
  onBack: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onBack }) => {
  const {
    data,
    isLoading,
    timeRange,
    setTimeRange,
    handleRefresh,
  } = useAdminController({ onBack });

  const timeRanges: Array<{ id: AdminTimeRange; label: string }> = [
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="min-h-screen bg-[#0c0d14] text-gray-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0c0d14]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              isIconOnly
              onClick={onBack}
              icon={<ArrowLeft size={16} />}
              className="text-gray-300 hover:text-white"
              aria-label="Back to Watchlist"
              title="Back to Watchlist"
            />
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Admin Analytics &amp; Adoption
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Time range selector */}
            <div className="hidden sm:flex items-center bg-white/5 border border-white/5 rounded-xl p-0.5">
              {timeRanges.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    timeRange === r.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isLoading}
              icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
              title="Refresh Analytics"
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">   
        {isLoading && !data && (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-purple-400 mx-auto" />
            <p className="text-xs text-gray-400">Loading platform analytics and telemetry...</p>
          </div>
        )}

        {/* Tab Views */}
        {data && (
          <div className="space-y-6">
            <div className="space-y-6 animate-in fade-in duration-150">
              <AdminKpiGrid kpis={data.kpis} />
              <ServiceAdoptionCard adoption={data.serviceAdoption} />
              <TopMoviesTable movies={data.topMovies} />
              <PollFeedbackCard
                totalVotes={data.pollResults.totalVotes}
                breakdown={data.pollResults.breakdown}
                customFeedback={data.pollResults.customFeedback}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
