import React, { useState, useEffect, useRef } from 'react';
import { isItemReady, isItemUnreleased } from '../lib/utils';
import { trackEvent } from '../lib/analytics';
import { useAuth, useWatchlist, useToast } from '../context/useAppContext';
import { systemService } from '../services';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { OnboardingCallout } from './OnboardingCallout';
import { RecommendedBanner } from './RecommendedBanner';
import { SearchSection } from './SearchSection';
import { FeaturePollCard, isBetaNoticeDismissed } from './FeaturePollCard';
import { MovieCard } from './MovieCard';
import { Pagination } from './Pagination';
import { GitHubSponsorButton } from './GitHubSponsorButton';
import { SettingsPage } from './SettingsPage';
import { ManageListsModal } from './ManageListsModal';
import { DeleteMovieModal } from './DeleteMovieModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { InstallGuideModal } from './InstallGuideModal';
import { QrCodeModal } from './QrCodeModal';
import { Button } from './Button';
import { Badge } from './Badge';
import { RotateCw, Eye, Folder, FolderPlus, Search, X, Sparkles } from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const { user, deleteAccount } = useAuth();
  const { showToast } = useToast();
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

  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings'>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#settings') {
      return 'settings';
    }
    return 'dashboard';
  });
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [manageListsTab, setManageListsTab] = useState<'standard' | 'custom'>('standard');
  const [manifestInfo, setManifestInfo] = useState<{
    manifestUrl?: string;
    stremioInstallUrl?: string;
  }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isBetaNoticeVisible, setIsBetaNoticeVisible] = useState<boolean>(
    () => !isBetaNoticeDismissed()
  );
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect redirect from Stremio TV QR code
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');
    const context = searchParams.get('context') || 'stremio_tv';

    if (source === 'stremio_tv_qr') {
      trackEvent('qr_code_scanned', {
        source: 'stremio_tv_qr',
        context: context,
      });
      showToast(
        '📱 Connected from Stremio TV! Search or add movies below to watch on your TV.',
        'info'
      );
    }
  }, [showToast]);

  useEffect(() => {
    systemService
      .getInfo()
      .then((info) => setManifestInfo(info))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#settings') {
        setCurrentView('settings');
      } else {
        setCurrentView('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenSettings = () => {
    setCurrentView('settings');
    window.location.hash = '#settings';
  };

  const handleBackFromSettings = () => {
    setCurrentView('dashboard');
    if (window.location.hash === '#settings') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

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

  // Delete account confirmation modal state
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleConfirmDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      const res = await deleteAccount();
      if (res.success) {
        setIsDeleteAccountOpen(false);
        setCurrentView('dashboard');
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Filters & Sort states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [includeWatchedInAll, setIncludeWatchedInAll] = useState(true);
  const [sortBy, setSortBy] = useState<
    | 'added_desc'
    | 'added_asc'
    | 'rating_desc'
    | 'rating_asc'
    | 'year_desc'
    | 'year_asc'
    | 'title_asc'
    | 'title_desc'
    | 'streams_desc'
  >('added_desc');

  const handleTabChange = (tab: typeof currentTab) => {
    setCurrentTab(tab);
    trackEvent('filter_tab_switched', { tab });
  };

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    trackEvent('sort_changed', { sortBy: newSort });
  };

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
        if (q.includes('1080p') || q.includes('4k') || q.includes('2160p') || q.includes('720p'))
          return false;
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
  }, [
    currentTab,
    activeCustomListId,
    selectedQuality,
    searchQuery,
    sortBy,
    itemsPerPage,
    includeWatchedInAll,
  ]);

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

  if (currentView === 'settings') {
    return (
      <>
        <SettingsPage
          onBack={handleBackFromSettings}
          onOpenDeleteAccount={() => setIsDeleteAccountOpen(true)}
          onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          manifestUrl={manifestInfo.manifestUrl}
          installUrl={manifestInfo.stremioInstallUrl}
        />
        <InstallGuideModal
          isOpen={isInstallGuideOpen}
          onClose={() => setIsInstallGuideOpen(false)}
          onOpenLogin={() => {}}
          onOpenQrModal={() => setIsQrModalOpen(true)}
          installUrl={manifestInfo.stremioInstallUrl}
          manifestUrl={manifestInfo.manifestUrl}
        />
        <DeleteAccountModal
          isOpen={isDeleteAccountOpen}
          userEmail={user?.email}
          onConfirm={handleConfirmDeleteAccount}
          onClose={() => setIsDeleteAccountOpen(false)}
          isDeleting={isDeletingAccount}
        />
        <QrCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          manifestUrl={manifestInfo.manifestUrl}
          installUrl={manifestInfo.stremioInstallUrl}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0d14]">
      <Navbar
        onOpenSettings={handleOpenSettings}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onOpenLists={() => setIsManageListsOpen(true)}
        onOpenDeleteAccount={() => setIsDeleteAccountOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Hero onOpenSettings={handleOpenSettings} onDismiss={() => setIsBetaNoticeVisible(false)} />
        <OnboardingCallout
          onScrollToRecommendations={() => {
            const el = document.getElementById('recommended-banner');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onFocusSearch={() => {
            window.scrollTo({ top: 350, behavior: 'smooth' });
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (searchInput) searchInput.focus();
          }}
        />
        <RecommendedBanner />
        <SearchSection />
        {!isBetaNoticeVisible && (
          <FeaturePollCard
            watchlistCount={items.length}
            userEmail={user?.email}
            isBetaNoticeVisible={isBetaNoticeVisible}
          />
        )}

        {/* Custom Lists Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 shrink-0">
            <Folder size={14} className="text-purple-400" />
            <span>Lists:</span>
          </div>

          <Button
            variant="pill"
            active={activeCustomListId === null}
            onClick={() => setActiveCustomListId(null)}
          >
            All Lists
          </Button>

          {customLists.map((l) => {
            const count = items.filter(
              (i) => Array.isArray(i.customLists) && i.customLists.includes(l.id)
            ).length;
            const isSelected = activeCustomListId === l.id;
            return (
              <Button
                key={l.id}
                variant="pill"
                active={isSelected}
                onClick={() => setActiveCustomListId(isSelected ? null : l.id)}
                icon={<span>{l.emoji || '📁'}</span>}
                badge={count}
              >
                {l.name}
              </Button>
            );
          })}

          <Button
            variant="indigo"
            className="rounded-xl shrink-0"
            onClick={() => {
              setManageListsTab('standard');
              setIsManageListsOpen(true);
            }}
            icon={<Sparkles size={13} />}
            title="Explore and add standard streaming lists (Netflix, Disney+, HBO Max, etc.)"
          >
            ⭐ Standard Lists
          </Button>

          <Button
            variant="outline"
            className="rounded-xl text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20 shrink-0"
            onClick={() => {
              setManageListsTab('custom');
              setIsManageListsOpen(true);
            }}
            icon={<FolderPlus size={13} />}
            title="Create and manage custom lists"
          >
            + Custom List
          </Button>
        </div>

        {/* Active List Indicator Banner */}
        {activeList && (
          <div className="mb-4 p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-purple-200">
              <span className="text-xl">{activeList.emoji || '🎬'}</span>
              <span>
                Showing movies in list <strong>{activeList.name}</strong> ({filtered.length} movie
                {filtered.length === 1 ? '' : 's'})
              </span>
            </div>
            <button
              onClick={() => setActiveCustomListId(null)}
              className="text-xs text-purple-400 hover:text-purple-200 font-semibold px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-colors cursor-pointer"
            >
              Show all movies ✕
            </button>
          </div>
        )}

        {/* Filter Tabs & Header */}
        <div
          ref={listTopRef}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4"
        >
          <div className="flex items-center gap-1 bg-[#151824] p-1 rounded-xl border border-white/5 overflow-x-auto">
            <Button
              variant="tab"
              tabTheme="blue"
              active={currentTab === 'all'}
              onClick={() => handleTabChange('all')}
            >
              📋 All ({stats.total})
            </Button>
            <Button
              variant="tab"
              tabTheme="emerald"
              active={currentTab === 'ready'}
              onClick={() => handleTabChange('ready')}
            >
              🟢 Ready ({stats.ready})
            </Button>
            <Button
              variant="tab"
              tabTheme="amber"
              active={currentTab === 'pending'}
              onClick={() => handleTabChange('pending')}
            >
              ⏳ Waiting ({stats.pending})
            </Button>
            <Button
              variant="tab"
              tabTheme="rose"
              active={currentTab === 'unreleased'}
              onClick={() => handleTabChange('unreleased')}
            >
              📅 Unreleased ({stats.unreleased})
            </Button>
            <Button
              variant="tab"
              tabTheme="purple"
              active={currentTab === 'watched'}
              onClick={() => handleTabChange('watched')}
            >
              👁️ Watched ({stats.watched})
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={recheckAll}
              disabled={isCheckingAll}
              isLoading={isCheckingAll}
              icon={<RotateCw size={13} />}
              title="Check Torrentio sources for all movies right now"
            >
              Check All Now
            </Button>
          </div>
        </div>

        {/* Filters & Sorting Toolbar */}
        <div className="bg-[#151824] border border-white/5 rounded-2xl p-3 sm:p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search within Watchlist */}
            <div className="relative flex-1 min-w-50">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
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
                <Button
                  type="button"
                  variant="outline"
                  className={`rounded-xl px-3 py-2 font-semibold ${
                    includeWatchedInAll
                      ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30'
                      : 'bg-[#1e2235] text-gray-400 border-white/10 hover:text-gray-200'
                  }`}
                  onClick={() => setIncludeWatchedInAll(!includeWatchedInAll)}
                  icon={
                    <Eye
                      size={13}
                      className={includeWatchedInAll ? 'text-purple-400' : 'text-gray-400'}
                    />
                  }
                  title={
                    includeWatchedInAll
                      ? 'Hide watched movies in All view'
                      : 'Include watched movies in All view'
                  }
                >
                  {includeWatchedInAll ? 'With Watched' : 'Hide Watched'}
                </Button>
              )}

              {/* Sort By */}
              <div className="relative flex items-center">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as any)}
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
                <Button
                  variant="danger"
                  className="rounded-xl px-2.5 py-2 font-semibold"
                  onClick={clearFilters}
                  icon={<X size={12} />}
                  title="Reset all filters"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Status & Results counter */}
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2.5 mt-2.5 border-t border-white/5">
            <span>
              Showing <strong className="text-white">{sorted.length}</strong>{' '}
              {sorted.length === 1 ? 'title' : 'titles'}
              {hasActiveFilters && ' (filtered)'}
            </span>
            {hasActiveFilters && (
              <Badge variant="purple" size="xs">
                Filters applied
              </Badge>
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
                    ? 'Use the recommendations or search bar above to start tracking movies.'
                    : 'Switch tabs or add more items to monitor.'}
            </p>
            {items.length === 0 && !hasActiveFilters && (
              <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
                <Button
                  variant="primary"
                  className="font-bold shadow-lg shadow-purple-900/30"
                  onClick={() => {
                    const el = document.getElementById('recommended-banner');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  icon={<Sparkles size={14} />}
                >
                  Explore Recommendations
                </Button>
                <Button
                  variant="outline"
                  className="hover:text-white"
                  onClick={() => {
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                    const searchInput = document.querySelector(
                      'input[type="text"]'
                    ) as HTMLInputElement;
                    if (searchInput) searchInput.focus();
                  }}
                  icon={<Search size={14} />}
                >
                  Search Movies
                </Button>
              </div>
            )}
            {hasActiveFilters && (
              <Button
                variant="solid"
                className="font-semibold px-3.5"
                onClick={clearFilters}
                icon={<X size={12} />}
              >
                Clear all filters
              </Button>
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
      </main>

      {/* Modals */}
      <InstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
        onOpenLogin={() => {}}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        installUrl={manifestInfo.stremioInstallUrl}
        manifestUrl={manifestInfo.manifestUrl}
      />
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
      <DeleteAccountModal
        isOpen={isDeleteAccountOpen}
        userEmail={user?.email}
        onConfirm={handleConfirmDeleteAccount}
        onClose={() => setIsDeleteAccountOpen(false)}
        isDeleting={isDeletingAccount}
      />
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        manifestUrl={manifestInfo.manifestUrl}
        installUrl={manifestInfo.stremioInstallUrl}
      />

      {/* Footer for authenticated users */}
      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="shrink-0">
            🎬{' '}
            <span className="font-semibold text-gray-400">
              Stremio Watchlist (Good Quality Tracker)
            </span>{' '}
            • Beta Version
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
    </div>
  );
};
