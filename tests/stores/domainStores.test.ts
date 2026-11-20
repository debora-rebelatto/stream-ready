import {
  useAuthStore,
  useSettingsStore,
  useCustomListStore,
  useWatchlistStore,
  useToastStore,
} from '../../src/stores';
import { authService, systemService } from '../../src/services';
import {
  useAuth,
  useWatchlist,
  useToast,
} from '../../src/context/useAppContext';
import type { WatchlistItem } from '../../src/models';

describe('Domain Stores & Single Source of Truth (Zustand)', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
    useAuthStore.setState({ user: null, isLoadingAuth: false });
    useSettingsStore.setState({
      globalMinQuality: '1080p',
      autoSyncWatched: false,
      trackWatchlistWatched: true,
      syncPreviouslyWatched: false,
    });
    useCustomListStore.setState({
      customLists: [],
      activeCustomListId: null,
      isListsLoading: false,
      curatedLists: [],
      isCuratedListsLoading: false,
    });
    useWatchlistStore.setState({
      items: [],
      stats: { total: 0, ready: 0, pending: 0, unreleased: 0, watched: 0 },
      currentTab: 'all',
      isLoadingList: false,
      isCheckingAll: false,
      isSyncingWatched: false,
    });
  });

  describe('ToastStore', () => {
    it('adds, dedupes, and removes toasts', () => {
      const { showToast, removeToast } = useToastStore.getState();

      showToast('First toast', 'info');
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].message).toBe('First toast');

      // Deduplication: sending duplicate message updates rather than stack identically
      showToast('First toast', 'success');
      expect(useToastStore.getState().toasts).toHaveLength(1);
      expect(useToastStore.getState().toasts[0].type).toBe('success');

      const toastId = useToastStore.getState().toasts[0].id;
      removeToast(toastId);
      expect(useToastStore.getState().toasts).toHaveLength(0);
    });
  });

  describe('AuthStore - checkAuth resilience', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('bypasses network check when no authKey is stored in browser', async () => {
      jest.spyOn(authService, 'getAuthKey').mockReturnValue('');
      const getStatusSpy = jest.spyOn(authService, 'getStatus');

      await useAuthStore.getState().checkAuth();

      expect(getStatusSpy).not.toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoadingAuth).toBe(false);
    });

    it('sets user and applies settings when authKey is valid', async () => {
      jest.spyOn(authService, 'getAuthKey').mockReturnValue('valid_key');
      jest.spyOn(authService, 'getStatus').mockResolvedValue({
        loggedIn: true,
        user: { id: 'u1', email: 'debyr.dbr@gmail.com', onboardingCompleted: false },
      });
      jest.spyOn(systemService, 'getSettings').mockResolvedValue({
        minQuality: '4k',
      });

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().user?.email).toBe('debyr.dbr@gmail.com');
      expect(useAuthStore.getState().isLoadingAuth).toBe(false);
      expect(useSettingsStore.getState().globalMinQuality).toBe('4k');
    });

    it('retains user session even if secondary settings fetch fails', async () => {
      jest.spyOn(authService, 'getAuthKey').mockReturnValue('valid_key');
      jest.spyOn(authService, 'getStatus').mockResolvedValue({
        loggedIn: true,
        user: { id: 'u1', email: 'debyr.dbr@gmail.com' },
      });
      jest.spyOn(systemService, 'getSettings').mockRejectedValue(new Error('Settings server down'));

      await useAuthStore.getState().checkAuth();

      // User session must NOT be cleared when settings fails
      expect(useAuthStore.getState().user?.email).toBe('debyr.dbr@gmail.com');
      expect(useAuthStore.getState().isLoadingAuth).toBe(false);
    });

    it('clears session when server returns 401 isUnauthorized', async () => {
      jest.spyOn(authService, 'getAuthKey').mockReturnValue('expired_key');
      const clearSpy = jest.spyOn(authService, 'clearAuth').mockImplementation(() => {});
      jest.spyOn(authService, 'getStatus').mockResolvedValue({
        loggedIn: false,
        isUnauthorized: true,
      });

      await useAuthStore.getState().checkAuth();

      expect(clearSpy).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isLoadingAuth).toBe(false);
    });
  });

  describe('SettingsStore', () => {
    it('applies loaded settings accurately', () => {
      const { applyLoadedSettings } = useSettingsStore.getState();

      applyLoadedSettings({
        minQuality: '4k',
        autoSyncWatched: true,
        trackWatchlistWatched: false,
        syncPreviouslyWatched: true,
      });

      const state = useSettingsStore.getState();
      expect(state.globalMinQuality).toBe('4k');
      expect(state.autoSyncWatched).toBe(true);
      expect(state.trackWatchlistWatched).toBe(false);
      expect(state.syncPreviouslyWatched).toBe(true);
    });
  });

  describe('CustomListStore', () => {
    it('sets and clears activeCustomListId', () => {
      const { setActiveCustomListId, clearCustomListsState } = useCustomListStore.getState();

      setActiveCustomListId('list-scifi');
      expect(useCustomListStore.getState().activeCustomListId).toBe('list-scifi');

      clearCustomListsState();
      expect(useCustomListStore.getState().activeCustomListId).toBeNull();
      expect(useCustomListStore.getState().customLists).toEqual([]);
    });
  });

  describe('WatchlistStore & Stats Recomputation', () => {
    it('computes stats whenever items are set', () => {
      const { setItems, setCurrentTab } = useWatchlistStore.getState();

      const sample: WatchlistItem[] = [
        {
          id: 'tt01',
          name: 'Ready Movie',
          type: 'movie',
          has1080pPlus: true,
          bestQuality: '1080p FHD',
          streamCount: 5,
          isWatched: false,
        },
        {
          id: 'tt02',
          name: 'Pending Movie',
          type: 'movie',
          has1080pPlus: false,
          bestQuality: '720p',
          streamCount: 2,
          isWatched: false,
        },
        {
          id: 'tt03',
          name: 'Watched Movie',
          type: 'movie',
          has1080pPlus: true,
          bestQuality: '4K UHD',
          streamCount: 12,
          isWatched: true,
        },
      ];

      setItems(sample);
      const state = useWatchlistStore.getState();
      expect(state.items).toHaveLength(3);
      expect(state.stats.total).toBe(3);
      expect(state.stats.ready).toBe(1);
      expect(state.stats.pending).toBe(1);
      expect(state.stats.watched).toBe(1);

      setCurrentTab('ready');
      expect(useWatchlistStore.getState().currentTab).toBe('ready');
    });

    it('clears watchlist state', () => {
      const { setItems, clearWatchlistState } = useWatchlistStore.getState();

      setItems([{ id: 'tt01', name: 'Movie', type: 'movie' }]);
      expect(useWatchlistStore.getState().items).toHaveLength(1);

      clearWatchlistState();
      expect(useWatchlistStore.getState().items).toHaveLength(0);
      expect(useWatchlistStore.getState().stats.total).toBe(0);
    });
  });

  describe('useAppContext Facade Bridge', () => {
    it('allows accessing and updating state through backward-compatible hooks', () => {
      useAuthStore.setState({
        user: { id: 'u123', email: 'test@stremio.com' },
        isLoadingAuth: false,
      });

      const auth = useAuth();
      expect(auth.user?.email).toBe('test@stremio.com');
      expect(auth.isLoading).toBe(false);

      const toast = useToast();
      toast.showToast('Adapter toast', 'info');
      expect(useToastStore.getState().toasts[0].message).toBe('Adapter toast');

      const watchlist = useWatchlist();
      expect(watchlist.items).toEqual([]);
      expect(watchlist.currentTab).toBe('all');
    });
  });
});
