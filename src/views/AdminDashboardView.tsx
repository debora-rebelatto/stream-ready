import React from 'react';
import {
  ArrowLeft,
  RefreshCw,
  LayoutDashboard,
  Tv,
  Film,
  Vote,
  AlertTriangle,
} from 'lucide-react';
import { useAdminController, type AdminTab, type AdminTimeRange } from '../controllers/useAdminController';
import { Button } from '../components';
import {
  AdminKpiGrid,
  ServiceAdoptionCard,
  TopMoviesTable,
  TopThreeMoviesCard,
  PollFeedbackCard,
  EventActivityFeed,
} from '../components/admin';

export interface AdminDashboardViewProps {
  onBack: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onBack }) => {
  const {
    data,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    activeTab,
    setActiveTab,
    handleRefresh,
  } = useAdminController({ onBack });

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview & KPIs', icon: <LayoutDashboard size={15} /> },
    { id: 'adoption', label: 'Service Adoption', icon: <Tv size={15} /> },
    { id: 'movies', label: 'Top Movies', icon: <Film size={15} /> },
    { id: 'feedback', label: 'Polls & Feedback', icon: <Vote size={15} /> },
  ];

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

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-purple-400' : 'text-gray-500'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Loading and Error States */}
        {isLoading && !data && (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-purple-400 mx-auto" />
            <p className="text-xs text-gray-400">Loading platform analytics and telemetry...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center space-y-4 max-w-xl mx-auto">
            <AlertTriangle size={28} className="text-red-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-red-200">Admin Authorization Required</h3>
              <p className="text-xs text-gray-300 mt-1">{error}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 text-left text-xs font-mono text-gray-300 space-y-2">
              <span className="text-[11px] text-purple-300 block font-sans font-semibold">
                To grant admin access, run this command in your Supabase SQL Editor:
              </span>
              <code className="block select-all text-emerald-400 bg-white/5 p-2 rounded-lg break-all">
                ALTER TABLE watchlist_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
                <br />
                UPDATE watchlist_users SET is_admin = TRUE WHERE email = 'your-stremio-email';
              </code>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry Verification
            </Button>
          </div>
        )}

        {/* Tab Views */}
        {data && (
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <AdminKpiGrid kpis={data.kpis} />
                <TopThreeMoviesCard movies={data.topMovies} />
                <ServiceAdoptionCard adoption={data.serviceAdoption} />
                <TopMoviesTable movies={data.topMovies} />
                <PollFeedbackCard
                  totalVotes={data.pollResults.totalVotes}
                  breakdown={data.pollResults.breakdown}
                  customFeedback={data.pollResults.customFeedback}
                />
              </div>
            )}

            {activeTab === 'adoption' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <ServiceAdoptionCard adoption={data.serviceAdoption} />
                <EventActivityFeed
                  eventsBreakdown={data.eventsBreakdown}
                  recentEvents={data.recentEvents}
                />
              </div>
            )}

            {activeTab === 'movies' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <TopThreeMoviesCard movies={data.topMovies} />
                <TopMoviesTable movies={data.topMovies} />
              </div>
            )}

            {activeTab === 'feedback' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <PollFeedbackCard
                  totalVotes={data.pollResults.totalVotes}
                  breakdown={data.pollResults.breakdown}
                  customFeedback={data.pollResults.customFeedback}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
