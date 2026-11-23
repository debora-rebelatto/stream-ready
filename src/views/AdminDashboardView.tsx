import React from 'react';
import {
  ArrowLeft,
  RefreshCw,
  Palette,
  Shield,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { useAdminController, type AdminTimeRange } from '../controllers/useAdminController';
import { Button, LoadingState } from '../components';
import {
  AdminKpiGrid,
  DailySignupsChart,
  DailyMoviesAddedChart,
  ServiceAdoptionCard,
  NotificationAnalyticsCard,
  TopMoviesTable,
  TopThreeMoviesCard,
  PollFeedbackCard,
  EventActivityFeed,
} from '../components/admin';

export interface AdminDashboardViewProps {
  onBack: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onBack }) => {
  const navigate = useNavigate();
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
              <Shield size={18} className="text-purple-400 shrink-0" />
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
              onClick={() => {
                navigate({ to: '/design-system' });
              }}
              icon={<Palette size={14} className="text-purple-400" />}
              title="Open Design System"
            >
              <span className="hidden sm:inline">Design System</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isLoading}
              icon={<RefreshCw size={14} />}
              title="Refresh Analytics"
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">   
        {isLoading && !data && (
          <LoadingState title="Loading platform analytics and telemetry..." />
        )}

        {data && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <AdminKpiGrid kpis={data.kpis} />
            <DailySignupsChart data={data.dailySignups} />
            <DailyMoviesAddedChart data={data.dailyMoviesAdded} />
            <TopThreeMoviesCard movies={data.topMovies} />
            <ServiceAdoptionCard adoption={data.serviceAdoption} />
            {data.serviceAdoption.notifications && (
              <NotificationAnalyticsCard notifications={data.serviceAdoption.notifications} />
            )}
            <TopMoviesTable movies={data.topMovies} />
            <EventActivityFeed
              eventsBreakdown={data.eventsBreakdown}
              recentEvents={data.recentEvents}
            />
            <PollFeedbackCard
              totalVotes={data.pollResults.totalVotes}
              breakdown={data.pollResults.breakdown}
              customFeedback={data.pollResults.customFeedback}
            />
          </div>
        )}
      </main>
    </div>
  );
};
