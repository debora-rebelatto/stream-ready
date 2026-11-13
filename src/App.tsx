import React, { useState, useEffect, useRef } from 'react';
import { isItemReady, isItemUnreleased } from './lib/utils';
import { useAuth, useWatchlist } from './context/useAppContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { SearchSection } from './components/SearchSection';
import { MovieCard } from './components/MovieCard';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { ManageListsModal } from './components/ManageListsModal';
import { LandingPage } from './components/LandingPage';
import { ToastContainer } from './components/ToastContainer';
import { Pagination } from './components/Pagination';
import { RotateCw, Film, Eye, Folder, FolderPlus } from 'lucide-react';

export const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    items,
    stats,
    currentTab,
    setCurrentTab,
    customLists,
    activeCustomListId,
    setActiveCustomListId,
    globalMinQuality,
    isLoading: isWatchlistLoading,
    isCheckingAll,
    removeItem,
    recheckAll,
  } = useWatchlist();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const listTopRef = useRef<HTMLDivElement>(null);

  // Filter items
  const filtered = items.filter((item) => {
    // If a custom list is selected, filter by that list
    if (activeCustomListId) {
      if (!Array.isArray(item.customLists) || !item.customLists.includes(activeCustomListId)) {
        return false;
      }
    }

    if (currentTab === 'watched') {
      return Boolean(item.isWatched);
    }
    // Never show watched movies in other active tabs
    if (item.isWatched) {
      return false;
    }

    if (currentTab === 'all') return true;
    if (currentTab === 'ready') return isItemReady(item, globalMinQuality);
    if (currentTab === 'unreleased') return isItemUnreleased(item);
    if (currentTab === 'pending') return !isItemReady(item, globalMinQuality) && !isItemUnreleased(item);
    return true;
  });

  // Reset to first page when changing tabs, lists, or itemsPerPage
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, activeCustomListId, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }
  };

  const activeList = customLists.find((l) => l.id === activeCustomListId);

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0d14]">
      <Navbar
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLists={() => setIsManageListsOpen(true)}
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

            {/* Custom Lists Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 shrink-0">
                <Folder size={14} className="text-purple-400" />
                <span>Lists:</span>
              </div>

              <button
                onClick={() => setActiveCustomListId(null)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  activeCustomListId === null
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                🌐 All Lists
              </button>

              {customLists.map((l) => {
                const count = items.filter(
                  (i) => Array.isArray(i.customLists) && i.customLists.includes(l.id)
                ).length;
                const isSelected = activeCustomListId === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setActiveCustomListId(isSelected ? null : l.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>{l.emoji || '📁'}</span>
                    <span>{l.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-purple-800 text-purple-200' : 'bg-white/10 text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setIsManageListsOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 flex items-center gap-1.5 shrink-0"
                title="Create and manage custom lists"
              >
                <FolderPlus size={13} />
                <span>+ New List</span>
              </button>
            </div>

            {/* Active List Indicator Banner */}
            {activeList && (
              <div className="mb-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-purple-200">
                  <span className="text-xl">{activeList.emoji || '🎬'}</span>
                  <span>
                    Showing movies in list <strong>{activeList.name}</strong> ({filtered.length} movie{filtered.length === 1 ? '' : 's'})
                  </span>
                </div>
                <button
                  onClick={() => setActiveCustomListId(null)}
                  className="text-xs text-purple-400 hover:text-purple-200 font-semibold px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-colors"
                >
                  Show all movies ✕
                </button>
              </div>
            )}

            {/* Filter Tabs & Header */}
            <div ref={listTopRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-1 bg-[#151824] p-1 rounded-xl border border-white/5 overflow-x-auto">
                <button
                  onClick={() => setCurrentTab('ready')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    currentTab === 'ready'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  🟢 Ready ({stats.ready})
                </button>
                <button
                  onClick={() => setCurrentTab('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    currentTab === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  ⏳ Waiting ({stats.pending})
                </button>
                <button
                  onClick={() => setCurrentTab('unreleased')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    currentTab === 'unreleased'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  📅 Unreleased ({stats.unreleased})
                </button>
                <button
                  onClick={() => setCurrentTab('watched')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    currentTab === 'watched'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  👁️ Watched ({stats.watched})
                </button>
                <button
                  onClick={() => setCurrentTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    currentTab === 'all'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  📋 All ({stats.total})
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={recheckAll}
                  disabled={isCheckingAll}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1f2438] hover:bg-[#252b42] text-gray-200 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
                  title="Check Torrentio sources for all movies right now"
                >
                  <RotateCw size={13} className={isCheckingAll ? 'animate-spin text-purple-400' : ''} />
                  {isCheckingAll ? 'Checking...' : 'Check All Now'}
                </button>
              </div>
            </div>

            {/* Movie List Content */}
            {isWatchlistLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
                <p className="text-xs text-gray-400">Loading your watchlist...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                <div className="text-4xl mb-3">
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
          <LandingPage onOpenLogin={() => setIsLoginOpen(true)} />
        )}
      </main>

      {/* Modals & Toast */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ManageListsModal isOpen={isManageListsOpen} onClose={() => setIsManageListsOpen(false)} />
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
