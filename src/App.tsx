import React, { useState, useEffect, useRef } from 'react';
import { isItemReady, isItemUnreleased } from './lib/utils';
import { useAuth, useWatchlist } from './context/useAppContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { RecommendedBanner } from './components/RecommendedBanner';
import { SearchSection } from './components/SearchSection';
import { MovieCard } from './components/MovieCard';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { ManageListsModal } from './components/ManageListsModal';
import { DeleteMovieModal } from './components/DeleteMovieModal';
import { LandingPage } from './components/LandingPage';
import { GitHubSponsorButton } from './components/GitHubSponsorButton';
import { ToastContainer } from './components/ToastContainer';
import { Pagination } from './components/Pagination';
import { RotateCw, Film, Eye, Folder, FolderPlus, Search, ArrowUpDown, Filter, X, Sparkles } from 'lucide-react';

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
  const [manageListsTab, setManageListsTab] = useState<'standard' | 'custom'>('standard');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const listTopRef = useRef<HTMLDivElement>(null);

  // Delete movie confirmation modal state
  const [movieToDelete, setMovieToDelete] = useState<{
    id: string;
    name: string;
    poster?: string;
    year?: string | number;
  } | null>(null);
  const [isDeletingMovie, setIsDeletingMovie] = useState(false);

  const handleDeleteRequest = (id: string, name: string) => {
    const found = items.find((i) => i.id === id);
    setMovieToDelete({
      id,
      name,
      poster: found?.poster,
      year: found?.year,
    });
  };

  const handleConfirmDelete = async () => {
    if (!movieToDelete || isDeletingMovie) return;
    setIsDeletingMovie(true);
    try {
      await removeItem(movieToDelete.id, movieToDelete.name);
      setMovieToDelete(null);
    } finally {
      setIsDeletingMovie(false);
    }
  };

  // New Filters & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [includeWatchedInAll, setIncludeWatchedInAll] = useState(true);
  const [sortBy, setSortBy] = useState<
    'added_desc' | 'added_asc' | 'rating_desc' | 'rating_asc' | 'year_desc' | 'year_asc' | 'title_asc' | 'title_desc' | 'streams_desc'
  >('added_desc');

  // Filter items
  const filtered = items.filter((item) => {
    // If a custom list is selected, filter by that list
    if (activeCustomListId) {
      if (!Array.isArray(item.customLists) || !item.customLists.includes(activeCustomListId)) {
        return false;
      }
    }

    if (currentTab === 'watched') {
      if (!item.isWatched) return false;
    } else if (currentTab === 'all') {
      // In 'All' tab, show all items (including watched by default unless user toggles them off)
      if (!includeWatchedInAll && item.isWatched) return false;
    } else {
      // Specific status tabs (ready, unreleased, pending) only show unwatched
      if (item.isWatched) return false;

      const ready = isItemReady(item, globalMinQuality);
      if (currentTab === 'ready' && !ready) return false;
      if (currentTab === 'unreleased' && !isItemUnreleased(item)) return false;
      if (currentTab === 'pending' && (ready || isItemUnreleased(item))) return false;
    }

    // Quality filter (only applies to active tracking views; watched items are archived history)
    if (currentTab !== 'watched' && selectedQuality !== 'all') {
      const q = String(item.bestQuality || '').toLowerCase();
      if (selectedQuality === '4k') {
        if (!q.includes('4k') && !q.includes('2160p')) return false;
      } else if (selectedQuality === '1080p') {
        if (!q.includes('1080p')) return false;
      } else if (selectedQuality === '720p') {
        if (!q.includes('720p')) return false;
      } else if (selectedQuality === 'pending') {
        if (q.includes('1080p') || q.includes('4k') || q.includes('2160p') || q.includes('720p')) return false;
      }
    }

    // Search query filter (instant search within list)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchYear = String(item.year || '').includes(q);
      if (!matchName && !matchYear) return false;
    }

    return true;
  });

  // Helper to extract 4-digit release year
  const getYearNum = (y?: string | number) => {
    if (!y) return 0;
    const match = String(y).match(/\d{4}/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Sort items
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'added_asc': {
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return da - db;
      }
      case 'rating_desc': {
        const ra = parseFloat(String(a.imdbRating || '0')) || 0;
        const rb = parseFloat(String(b.imdbRating || '0')) || 0;
        if (ra !== rb) {
          if (ra === 0) return 1;
          if (rb === 0) return -1;
          return rb - ra;
        }
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) return yb - ya;
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return db - da;
        return (a.name || '').localeCompare(b.name || '');
      }
      case 'rating_asc': {
        const ra = parseFloat(String(a.imdbRating || '0')) || 0;
        const rb = parseFloat(String(b.imdbRating || '0')) || 0;
        if (ra !== rb) {
          if (ra === 0) return 1;
          if (rb === 0) return -1;
          return ra - rb;
        }
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) return ya - yb;
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return da - db;
        return (b.name || '').localeCompare(a.name || '');
      }
      case 'year_desc': {
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) {
          if (ya === 0) return 1;
          if (yb === 0) return -1;
          return yb - ya;
        }
        // Secondary sort for identical release year: newest added first, then title
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return db - da;
        return (a.name || '').localeCompare(b.name || '');
      }
      case 'year_asc': {
        const ya = getYearNum(a.year);
        const yb = getYearNum(b.year);
        if (ya !== yb) {
          if (ya === 0) return 1;
          if (yb === 0) return -1;
          return ya - yb;
        }
        // Secondary sort for identical release year: oldest added first, then reverse title
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        if (da !== db) return da - db;
        return (b.name || '').localeCompare(a.name || '');
      }
      case 'title_asc': {
        return (a.name || '').localeCompare(b.name || '');
      }
      case 'title_desc': {
        return (b.name || '').localeCompare(a.name || '');
      }
      case 'streams_desc': {
        return (b.streamCount || 0) - (a.streamCount || 0);
      }
      case 'added_desc':
      default: {
        const da = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const db = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return db - da;
      }
    }
  });

  // Reset to first page when changing tabs, lists, or itemsPerPage
  useEffect(() => {
    setCurrentPage(1);
  }, [currentTab, activeCustomListId, selectedQuality, searchQuery, sortBy, itemsPerPage, includeWatchedInAll]);

  const hasActiveFilters =
    searchQuery !== '' ||
    (currentTab !== 'watched' && selectedQuality !== 'all') ||
    sortBy !== 'added_desc' ||
    (currentTab === 'all' && !includeWatchedInAll);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedQuality('all');
    setSortBy('added_desc');
    setIncludeWatchedInAll(true);
  };

  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = sorted.slice(startIndex, startIndex + itemsPerPage);

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
            <RecommendedBanner />
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
                onClick={() => {
                  setManageListsTab('standard');
                  setIsManageListsOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 flex items-center gap-1.5 shrink-0"
                title="Explore and add standard streaming lists (Netflix, Disney+, HBO Max, etc.)"
              >
                <Sparkles size={13} />
                <span>⭐ Standard Lists</span>
              </button>

              <button
                onClick={() => {
                  setManageListsTab('custom');
                  setIsManageListsOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 flex items-center gap-1.5 shrink-0"
                title="Create and manage custom lists"
              >
                <FolderPlus size={13} />
                <span>+ Custom List</span>
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
            <div ref={listTopRef} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-1 bg-[#151824] p-1 rounded-xl border border-white/5 overflow-x-auto">
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

            {/* Filters & Sorting Toolbar */}
            <div className="bg-[#151824] border border-white/5 rounded-2xl p-3 sm:p-4 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search within Watchlist */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by title or year in your list..."
                    className="w-full bg-[#1e2235] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded transition-colors"
                      title="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Dropdowns group */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Quality Filter (only for active tracking views; watched items are archived) */}
                  {currentTab !== 'watched' && (
                    <div className="relative">
                      <select
                        value={selectedQuality}
                        onChange={(e) => setSelectedQuality(e.target.value)}
                        className="bg-[#1e2235] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500/60 cursor-pointer hover:border-white/20 transition-colors"
                      >
                        <option value="all">🎯 All Qualities</option>
                        <option value="4k">✨ 4K / 2160p</option>
                        <option value="1080p">💎 1080p Full HD</option>
                        <option value="720p">📺 720p HD</option>
                        <option value="pending">⏳ Waiting / Pending</option>
                      </select>
                    </div>
                  )}

                  {/* Include Watched toggle (only shown in 'All' tab) */}
                  {currentTab === 'all' && (
                    <button
                      type="button"
                      onClick={() => setIncludeWatchedInAll(!includeWatchedInAll)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        includeWatchedInAll
                          ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30'
                          : 'bg-[#1e2235] text-gray-400 border-white/10 hover:text-gray-200'
                      }`}
                      title={
                        includeWatchedInAll
                          ? 'Hide watched movies in All view'
                          : 'Include watched movies in All view'
                      }
                    >
                      <Eye size={13} className={includeWatchedInAll ? 'text-purple-400' : 'text-gray-400'} />
                      <span>{includeWatchedInAll ? 'With Watched' : 'Hide Watched'}</span>
                    </button>
                  )}

                  {/* Sort By */}
                  <div className="relative flex items-center">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-[#1e2235] border border-white/10 rounded-xl px-3 py-2 text-xs text-purple-300 font-medium focus:outline-none focus:border-purple-500/60 cursor-pointer hover:border-white/20 transition-colors"
                    >
                      <option value="added_desc">↕️ Added: Newest First</option>
                      <option value="added_asc">↕️ Added: Oldest First</option>
                      <option value="rating_desc">⭐ Rating: Highest First</option>
                      <option value="rating_asc">⭐ Rating: Lowest First</option>
                      <option value="year_desc">📅 Year: Newest First</option>
                      <option value="year_asc">📅 Year: Oldest First</option>
                      <option value="title_asc">🔤 Title: A → Z</option>
                      <option value="title_desc">🔤 Title: Z → A</option>
                      <option value="streams_desc">📡 Most Sources Available</option>
                    </select>
                  </div>

                  {/* Clear Filters Button */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Reset all filters"
                    >
                      <X size={12} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status & Results counter */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2.5 mt-2.5 border-t border-white/5">
                <span>
                  Showing <strong className="text-white">{sorted.length}</strong> {sorted.length === 1 ? 'title' : 'titles'}
                  {hasActiveFilters && ' (filtered)'}
                </span>
                {hasActiveFilters && (
                  <span className="text-purple-400 text-[10px]">
                    Filters applied
                  </span>
                )}
              </div>
            </div>

            {/* Movie List Content */}
            {isWatchlistLoading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-3" />
                <p className="text-xs text-gray-400">Loading your watchlist...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="py-20 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
                <div className="text-4xl mb-3">
                  {hasActiveFilters
                    ? '🔍'
                    : currentTab === 'ready'
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
                  {hasActiveFilters
                    ? 'No titles found with active filters'
                    : currentTab === 'ready'
                    ? 'No movies ready in good quality yet'
                    : currentTab === 'pending'
                    ? 'No movies waiting for good quality!'
                    : currentTab === 'unreleased'
                    ? 'No unreleased movies found!'
                    : currentTab === 'watched'
                    ? 'No movies in your watched history'
                    : 'Your watchlist is empty'}
                </h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mb-3">
                  {hasActiveFilters
                    ? 'Try searching for another title or clearing the selected filters.'
                    : currentTab === 'watched'
                    ? 'Click the eye icon on any movie card to mark it as watched and archive it.'
                    : items.length === 0
                    ? 'Use the search bar above to start tracking movies.'
                    : 'Switch tabs or add more items to monitor.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <X size={12} />
                    <span>Clear all filters</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                  {paginatedItems.map((item) => (
                    <MovieCard key={item.id} item={item} onDelete={handleDeleteRequest} />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={sorted.length}
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
      <ManageListsModal
        isOpen={isManageListsOpen}
        onClose={() => setIsManageListsOpen(false)}
        initialTab={manageListsTab}
      />
      <DeleteMovieModal
        isOpen={!!movieToDelete}
        movieName={movieToDelete?.name || ''}
        moviePoster={movieToDelete?.poster}
        movieYear={movieToDelete?.year}
        onConfirm={handleConfirmDelete}
        onClose={() => setMovieToDelete(null)}
        isDeleting={isDeletingMovie}
      />
      <ToastContainer />

      {/* Footer for authenticated users (LandingPage has its own footer) */}
      {user && (
        <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="shrink-0">
              🎬 <span className="font-semibold text-gray-400">Stremio Watchlist (Good Quality Tracker)</span> • Beta Version
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-gray-400 text-[11px] hidden sm:inline">Support the project:</span>
              <GitHubSponsorButton size="sm" />
            </div>
            <p className="text-[11px] text-gray-600 shrink-0">
              Disclaimer: Community tool not affiliated with Stremio.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};
