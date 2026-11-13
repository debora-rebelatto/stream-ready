import React, { useState, useEffect, useRef } from 'react';
import { isItemReady, isItemUnreleased } from './lib/utils';
import { useAuth, useWatchlist } from './context/useAppContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { SearchSection } from './components/SearchSection';
import { MovieCard } from './components/MovieCard';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { LandingPage } from './components/LandingPage';
import { ToastContainer } from './components/ToastContainer';
import { Pagination } from './components/Pagination';
import { RotateCw, Film, Eye } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    items,
    stats,
    currentTab,
    setCurrentTab,
    globalMinQuality,
    isLoading: isWatchlistLoading,
    isCheckingAll,
    isSyncingWatched,
    syncWatchedFromStremio,
    removeItem,
    recheckAll,
  } = useWatchlist();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const listTopRef = useRef<HTMLDivElement>(null);

  // Filter items
  const filtered = items.filter((item) => {
    if (currentTab === 'watched') {
      return Boolean(item.isWatched);
    }

    // All active tabs hide watched items
    if (item.isWatched) return false;

    const ready = isItemReady(item, globalMinQuality);
    if (currentTab === 'ready') return ready;
    if (currentTab === 'unreleased') return !ready && isItemUnreleased(item);
    if (currentTab === 'pending') return !ready && !isItemUnreleased(item);
    return true;
  });

  // Reset page when switching tabs or changing items per page
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  // Keep currentPage within bounds if items are removed
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0d14]">
      <Navbar
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isAuthLoading ? (
          /* Loading State while checking authentication */
          <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-3 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-gray-300">Checking Stremio session...</p>
            <p className="text-xs text-gray-500 mt-1">Loading your profile and quality tracker</p>
          </div>
        ) : user ? (
          <>
            <Hero onOpenSettings={() => setIsSettingsOpen(true)} />
            <SearchSection />

            {/* List Header & Controls */}
            <div ref={listTopRef} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10 scroll-mt-24">
              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setCurrentTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'all'
                      ? 'bg-[#1f2438] text-white border border-white/20 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📋 All ({stats.total})
                </button>

                <button
                  onClick={() => setCurrentTab('ready')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'ready'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  🟢 Ready ({stats.ready})
                </button>

                <button
                  onClick={() => setCurrentTab('pending')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  ⏳ Waiting ({stats.pending})
                </button>

                <button
                  onClick={() => setCurrentTab('unreleased')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'unreleased'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  📅 Unreleased ({stats.unreleased})
                </button>

                <button
                  onClick={() => setCurrentTab('watched')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    currentTab === 'watched'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  👁️ Watched ({stats.watched})
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={syncWatchedFromStremio}
                  disabled={isSyncingWatched}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/30 transition-all cursor-pointer disabled:opacity-50"
                  title="Sync watched movies from your official Stremio history"
                >
                  <Eye size={13} className={isSyncingWatched ? 'animate-pulse text-purple-400' : ''} />
                  {isSyncingWatched ? 'Syncing...' : 'Sync Stremio Watched'}
                </button>

                <button
                  onClick={recheckAll}
                  disabled={isCheckingAll}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-transparent hover:bg-white/5 text-gray-300 hover:text-white border border-white/15 transition-all cursor-pointer disabled:opacity-50"
                  title="Recheck streams for all pending movies"
                >
                  <RotateCw size={13} className={isCheckingAll ? 'animate-spin text-purple-400' : ''} />
                  {isCheckingAll ? 'Checking...' : 'Recheck Pending'}
                </button>
              </div>
            </div>

            {/* Watchlist Grid */}
            {isWatchlistLoading ? (
              <div className="py-20 text-center text-sm text-gray-400">Loading your watchlist...</div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="text-4xl mb-3 opacity-60">
                  {currentTab === 'ready'
                    ? '🎬'
                    : currentTab === 'pending'
                    ? '⏳'
                    : currentTab === 'watched'
                    ? '👁️'
                    : currentTab === 'unreleased'
                    ? '📅'
                    : '📋'}
                </div>
                <h4 className="text-base font-bold text-white mb-1">
                  {currentTab === 'ready'
                    ? 'No movies ready in good quality yet'
                    : currentTab === 'pending'
                    ? 'No movies waiting for good quality!'
                    : currentTab === 'unreleased'
                    ? 'No unreleased movies found!'
                    : currentTab === 'watched'
                    ? 'No movies in your watched history'
                    : 'Your watchlist is empty'}
                </h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  {currentTab === 'watched'
                    ? 'Click the eye icon on any movie card to mark it as watched and archive it.'
                    : items.length === 0
                    ? 'Use the search bar above to start tracking movies.'
                    : 'Switch tabs or add more items to monitor.'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {paginatedItems.map((item) => (
                    <MovieCard key={item.id} item={item} onDelete={removeItem} />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filtered.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={setItemsPerPage}
                />
              </>
            )}
          </>
        ) : (
          /* Landing Page for visitors */
          <LandingPage onOpenLogin={() => setIsLoginOpen(true)} />
        )}
      </main>

      {/* Modals & Toast */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ToastContainer />

      {/* Footer for authenticated users (LandingPage has its own footer) */}
      {user && (
        <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500">
          <p>
            🎬 <span className="font-semibold text-gray-400">Stremio Watchlist (Good Quality Tracker)</span> • Beta Version
          </p>
          <p className="mt-1 text-[11px] text-gray-600">
            Disclaimer: This community tool uses public stream metadata and is not affiliated with or endorsed by Stremio.
          </p>
        </footer>
      )}
    </div>
  );
};
