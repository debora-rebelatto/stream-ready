import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth, useWatchlist, useToast } from '../context/useAppContext';
import { systemService, watchlistService, adminService, cinemetaService } from '../services';
import type { TopMovieMetric, SetupWizardMode, KpiMetrics } from '../models';
import {
  trackEvent,
  filterWatchlistItems,
  sortWatchlistItems,
  type WatchlistSortOption,
} from '../utils';
import { isBetaNoticeDismissed } from '../components/feedback';
import { isUserOnboardingCompleted } from './useSetupWizardController';

export function useDashboardController() {
  const { user, deleteAccount, markOnboardingCompleted } = useAuth();
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
    addItem,
    removeItem,
    recheckAll,
  } = useWatchlist();

  const [topMovies, setTopMovies] = useState<TopMovieMetric[]>([]);
  const [isAddingTopMovieId, setIsAddingTopMovieId] = useState<string | null>(null);
  const [adminKpis, setAdminKpis] = useState<KpiMetrics | null>(null);

  useEffect(() => {
    let isCancelled = false;
    watchlistService
      .getTopMovies(3)
      .then(async (movies) => {
        if (isCancelled || !Array.isArray(movies)) return;

        setTopMovies(movies);

        const needsEnrichment = movies.some((m) => !m.description);
        if (needsEnrichment) {
          const enriched = await Promise.all(
            movies.map(async (m) => {
              if (m.description) return m;
              try {
                const meta = await cinemetaService.getMeta('movie', m.id);
                if (meta?.description) {
                  return {
                    ...m,
                    description: meta.description,
                    genres: m.genres && m.genres.length > 0 ? m.genres : meta.genres,
                    poster: m.poster || meta.poster,
                    year: m.year || meta.year,
                  };
                }
              } catch (err) {
                console.warn(`[useDashboardController] Failed to enrich metadata for ${m.id}:`, err);
              }
              return m;
            })
          );
          if (!isCancelled) {
            setTopMovies(enriched);
          }
        }
      })
      .catch((err) => {
        console.warn('[useDashboardController] Failed to fetch top movies:', err);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.isAdmin) {
      setAdminKpis(null);
      return;
    }
    let isCancelled = false;
    adminService
      .fetchAnalytics('all')
      .then((data) => {
        if (!isCancelled && data?.kpis) {
          setAdminKpis(data.kpis);
        }
      })
      .catch((err) => {
        console.warn('[useDashboardController] Failed to load admin analytics summary:', err);
      });
    return () => {
      isCancelled = true;
    };
  }, [user?.isAdmin]);

  const userMovieIdSet = useMemo(() => {
    return new Set((items || []).map((i) => i.id));
  }, [items]);

  const handleQuickAddTopMovie = async (movie: TopMovieMetric) => {
    if (!movie || !movie.id) return;
    setIsAddingTopMovieId(movie.id);
    try {
      await addItem(movie.id, 'manual');
    } finally {
      setIsAddingTopMovieId(null);
    }
  };

  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'settings' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#settings') return 'settings';
      if (window.location.hash === '#admin') return 'admin';
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
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false);
  const [setupWizardMode, setSetupWizardMode] = useState<SetupWizardMode>('first-login');
  const [completedInSessionUserId, setCompletedInSessionUserId] = useState<string | null>(null);
  const listTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setIsSetupWizardOpen(false);
      setCompletedInSessionUserId(null);
      return;
    }
    const userKey = user.id || user.email;
    if (
      !isUserOnboardingCompleted(user) &&
      completedInSessionUserId !== userKey &&
      items.length === 0 &&
      !isWatchlistLoading
    ) {
      setSetupWizardMode('first-login');
      setIsSetupWizardOpen(true);
    }
  }, [user, completedInSessionUserId, items.length, isWatchlistLoading]);

  useEffect(() => {
    if (!user) return;
    if (!user.onboardingCompleted && items.length > 0) {
      void markOnboardingCompleted(true);
    }
  }, [user, items.length, markOnboardingCompleted]);

  const handleOpenSetupWizardReview = () => {
    setSetupWizardMode('review');
    setIsSetupWizardOpen(true);
  };

  const handleCloseSetupWizard = () => {
    if (setupWizardMode === 'review') {
      setIsSetupWizardOpen(false);
    } else {
      void handleSetupWizardComplete(items.length > 0);
    }
  };

  const handleSetupWizardComplete = async (_hasMovies?: boolean) => {
    const userKey = user?.id || user?.email || null;
    if (setupWizardMode === 'first-login' && userKey) {
      setCompletedInSessionUserId(userKey);
    }
    if (!user?.onboardingCompleted) {
      await markOnboardingCompleted(true);
    }
    setIsSetupWizardOpen(false);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const source = searchParams.get('source');
    const context = searchParams.get('context') || 'stremio_tv';

    if (source === 'stremio_tv_qr') {
      trackEvent('qr_landing_viewed', {
        source: 'stremio_tv_qr',
        context,
        alreadyLoggedIn: true,
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
      } else if (window.location.hash === '#admin') {
        setCurrentView('admin');
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

  const handleOpenAdmin = () => {
    setCurrentView('admin');
    window.location.hash = '#admin';
  };

  const handleBackFromAdmin = () => {
    setCurrentView('dashboard');
    if (window.location.hash === '#admin') {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [includeWatchedInAll, setIncludeWatchedInAll] = useState(true);
  const [sortBy, setSortBy] = useState<WatchlistSortOption>('added_desc');

  const handleTabChange = (tab: typeof currentTab) => {
    setCurrentTab(tab);
    trackEvent('filter_tab_switched', { tab });
  };

  const handleSortChange = (newSort: WatchlistSortOption) => {
    setSortBy(newSort);
    trackEvent('sort_changed', { sortBy: newSort });
  };

  const filtered = filterWatchlistItems(items, {
    currentTab,
    activeCustomListId,
    selectedQuality,
    includeWatchedInAll,
    searchQuery,
    globalMinQuality,
  });

  const sorted = sortWatchlistItems(filtered, sortBy);

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

  return {
    user,
    items,
    stats,
    currentTab,
    customLists,
    activeCustomListId,
    setActiveCustomListId,
    globalMinQuality,
    isWatchlistLoading,
    isCheckingAll,
    recheckAll,
    isInstallGuideOpen,
    setIsInstallGuideOpen,
    currentView,
    setCurrentView,
    handleOpenSettings,
    handleBackFromSettings,
    handleOpenAdmin,
    handleBackFromAdmin,
    isManageListsOpen,
    setIsManageListsOpen,
    isQrModalOpen,
    setIsQrModalOpen,
    manageListsTab,
    setManageListsTab,
    manifestInfo,
    currentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    paginatedItems,
    handlePageChange,
    listTopRef,
    isBetaNoticeVisible,
    setIsBetaNoticeVisible,
    movieToDelete,
    setMovieToDelete,
    isDeletingMovie,
    handleDeleteRequest,
    handleConfirmDelete,
    isDeleteAccountOpen,
    setIsDeleteAccountOpen,
    isDeletingAccount,
    handleConfirmDeleteAccount,
    searchQuery,
    setSearchQuery,
    selectedQuality,
    setSelectedQuality,
    includeWatchedInAll,
    setIncludeWatchedInAll,
    sortBy,
    handleTabChange,
    handleSortChange,
    sorted,
    hasActiveFilters,
    clearFilters,
    activeList,
    topMovies,
    isAddingTopMovieId,
    handleQuickAddTopMovie,
    userMovieIdSet,
    adminKpis,
    isSetupWizardOpen,
    setupWizardMode,
    handleOpenSetupWizardReview,
    handleCloseSetupWizard,
    handleSetupWizardComplete,
  };
}
