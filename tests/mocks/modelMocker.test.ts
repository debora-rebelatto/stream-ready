import { IdMocker, ModelMocker } from './modelMocker';

describe('IdMocker', () => {
  beforeEach(() => {
    IdMocker.reset();
  });

  it('generates sequential IMDb identifiers', () => {
    expect(IdMocker.imdb()).toBe('tt0000001');
    expect(IdMocker.imdb()).toBe('tt0000002');
  });

  it('generates RFC4122-compliant UUIDs', () => {
    const uuid1 = IdMocker.uuid();
    const uuid2 = IdMocker.uuid();

    expect(uuid1).toBe('00000000-0000-4000-8000-000000000001');
    expect(uuid2).toBe('00000000-0000-4000-8000-000000000002');

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(uuid1)).toBe(true);
    expect(uuidRegex.test(uuid2)).toBe(true);
  });

  it('generates user IDs using uuid format', () => {
    const user1 = IdMocker.user();
    expect(user1).toBe('00000000-0000-4000-8000-000000000001');
  });

  it('generates custom list IDs sequentially', () => {
    expect(IdMocker.customList()).toBe('list_001');
    expect(IdMocker.customList()).toBe('list_002');
  });

  it('generates stremio auth keys sequentially', () => {
    expect(IdMocker.authKey()).toBe('stremio_auth_token_0001');
    expect(IdMocker.authKey()).toBe('stremio_auth_token_0002');
  });

  it('generates toast IDs sequentially', () => {
    expect(IdMocker.toast()).toBe('toast_1');
    expect(IdMocker.toast()).toBe('toast_2');
  });

  it('resets all counters back to zero when reset() is called', () => {
    IdMocker.imdb();
    IdMocker.uuid();
    IdMocker.customList();

    IdMocker.reset();

    expect(IdMocker.imdb()).toBe('tt0000001');
    expect(IdMocker.uuid()).toBe('00000000-0000-4000-8000-000000000001');
    expect(IdMocker.customList()).toBe('list_001');
  });
});

describe('ModelMocker', () => {
  beforeEach(() => {
    IdMocker.reset();
  });

  describe('watchlistItem', () => {
    it('creates a complete default WatchlistItem', () => {
      const item = ModelMocker.watchlistItem();

      expect(item.id).toBe('tt0000001');
      expect(item.userId).toBe('00000000-0000-4000-8000-000000000001');
      expect(item.type).toBe('movie');
      expect(item.name).toBe('Mock Movie tt0000001');
      expect(item.has1080pPlus).toBe(true);
      expect(item.bestQuality).toBe('1080p');
      expect(item.isWatched).toBe(false);
      expect(item.customLists).toEqual([]);
    });

    it('allows partial property overrides', () => {
      const item = ModelMocker.watchlistItem({
        id: 'tt9999999',
        name: 'Custom Overridden Movie',
        isWatched: true,
        watchedAt: '2024-02-01T00:00:00.000Z',
        minQuality: '4k',
        customLists: ['list_001'],
      });

      expect(item.id).toBe('tt9999999');
      expect(item.name).toBe('Custom Overridden Movie');
      expect(item.isWatched).toBe(true);
      expect(item.watchedAt).toBe('2024-02-01T00:00:00.000Z');
      expect(item.minQuality).toBe('4k');
      expect(item.customLists).toEqual(['list_001']);
    });
  });

  describe('user', () => {
    it('creates a default StremioUser with generated UUID', () => {
      const user = ModelMocker.user();

      expect(user.id).toBe('00000000-0000-4000-8000-000000000001');
      expect(user.email).toContain('@example.com');
      expect(user.isAdmin).toBe(false);
    });

    it('allows overriding user properties', () => {
      const admin = ModelMocker.user({
        id: 'admin-uuid-1234',
        email: 'admin@stremio.com',
        isAdmin: true,
      });

      expect(admin.id).toBe('admin-uuid-1234');
      expect(admin.email).toBe('admin@stremio.com');
      expect(admin.isAdmin).toBe(true);
    });
  });

  describe('customList', () => {
    it('creates a default CustomList', () => {
      const list = ModelMocker.customList();

      expect(list.id).toBe('list_001');
      expect(list.userId).toBe('00000000-0000-4000-8000-000000000001');
      expect(list.name).toBe('Custom List list_001');
      expect(list.emoji).toBe('🍿');
      expect(list.itemsCount).toBe(0);
    });

    it('allows overriding CustomList properties', () => {
      const list = ModelMocker.customList({
        name: 'Horror Night',
        emoji: '🎃',
        itemsCount: 5,
      });

      expect(list.name).toBe('Horror Night');
      expect(list.emoji).toBe('🎃');
      expect(list.itemsCount).toBe(5);
    });
  });

  describe('curatedList and curatedListItem', () => {
    it('creates a default CuratedListItem', () => {
      const item = ModelMocker.curatedListItem();

      expect(item.id).toBe('tt0000001');
      expect(item.name).toBe('Curated Film tt0000001');
      expect(item.genres).toEqual(['Drama']);
    });

    it('creates a default CuratedList with child items', () => {
      const curated = ModelMocker.curatedList();

      expect(curated.id).toContain('curated_');
      expect(curated.name).toBe('Essential Sci-Fi Classics');
      expect(curated.items.length).toBe(2);
      expect(curated.itemsCount).toBe(2);
      expect(curated.isAdded).toBe(false);
    });

    it('allows overriding CuratedList properties', () => {
      const customCurated = ModelMocker.curatedList({
        name: 'Oscar Winners',
        isAdded: true,
      });

      expect(customCurated.name).toBe('Oscar Winners');
      expect(customCurated.isAdded).toBe(true);
    });
  });

  describe('settings', () => {
    it('creates default AppSettings', () => {
      const settings = ModelMocker.settings();

      expect(settings.minQuality).toBe('1080p');
      expect(settings.autoSyncWatched).toBe(false);
      expect(settings.trackWatchlistWatched).toBe(true);
      expect(settings.stremioAuthKey).toContain('stremio_auth_token_');
    });

    it('allows overriding settings', () => {
      const settings = ModelMocker.settings({
        minQuality: '4k',
        autoSyncWatched: true,
      });

      expect(settings.minQuality).toBe('4k');
      expect(settings.autoSyncWatched).toBe(true);
    });
  });

  describe('watchlistStats', () => {
    it('creates default WatchlistStats', () => {
      const stats = ModelMocker.watchlistStats();

      expect(stats.total).toBe(10);
      expect(stats.ready).toBe(6);
      expect(stats.pending).toBe(2);
      expect(stats.unreleased).toBe(1);
      expect(stats.watched).toBe(1);
    });

    it('allows overriding stats', () => {
      const stats = ModelMocker.watchlistStats({ total: 20, ready: 15 });

      expect(stats.total).toBe(20);
      expect(stats.ready).toBe(15);
    });
  });

  describe('searchMovieResult', () => {
    it('creates default SearchMovieResult', () => {
      const result = ModelMocker.searchMovieResult();

      expect(result.id).toBe('tt0000001');
      expect(result.name).toBe('Search Result tt0000001');
      expect(result.year).toBe(2024);
    });

    it('allows overriding search result properties', () => {
      const result = ModelMocker.searchMovieResult({
        name: 'Inception',
        year: 2010,
      });

      expect(result.name).toBe('Inception');
      expect(result.year).toBe(2010);
    });
  });

  describe('qualityCheckResult, parsedStreams and streamItem', () => {
    it('creates default QualityCheckResult', () => {
      const res = ModelMocker.qualityCheckResult();

      expect(res.has1080pPlus).toBe(true);
      expect(res.isReady).toBe(true);
      expect(res.isCamOnly).toBe(false);
      expect(res.bestQuality).toBe('1080p');
      expect(res.streamCount).toBe(4);
    });

    it('creates default ParsedStreams', () => {
      const streams = ModelMocker.parsedStreams();

      expect(streams.has1080pPlus).toBe(true);
      expect(streams.streamCount).toBe(8);
      expect(streams.cleanStreamCount).toBe(8);
    });

    it('creates default StreamItem', () => {
      const stream = ModelMocker.streamItem();

      expect(stream.name).toContain('Torrentio');
      expect(stream.title).toContain('1080p');
      expect(stream.behaviorHints?.filename).toBe('Movie.2024.1080p.mkv');
    });
  });

  describe('cinemetaDetail, cinemetaItem and stremioWatchedMovie', () => {
    it('creates default CinemetaItem', () => {
      const item = ModelMocker.cinemetaItem();

      expect(item.id).toBe('tt0000001');
      expect(item.name).toBe('Cinemeta Item tt0000001');
      expect(item.genres).toEqual(['Action']);
    });

    it('creates default CinemetaDetail', () => {
      const detail = ModelMocker.cinemetaDetail();

      expect(detail.id).toBe('tt0000001');
      expect(detail.name).toBe('Cinemeta Movie tt0000001');
      expect(detail.runtime).toBe('120 min');
    });

    it('creates default StremioWatchedMovie', () => {
      const watched = ModelMocker.stremioWatchedMovie();

      expect(watched.id).toBe('tt0000001');
      expect(watched.isWatched).toBe(true);
      expect(watched.watchedAt).toBeDefined();
    });
  });

  describe('toast and serverInfo', () => {
    it('creates default ToastMessage', () => {
      const toast = ModelMocker.toast();

      expect(toast.id).toBe('toast_1');
      expect(toast.type).toBe('success');
      expect(toast.message).toBe('Operation succeeded');
    });

    it('creates default ServerInfo', () => {
      const info = ModelMocker.serverInfo();

      expect(info.port).toBe(7000);
      expect(info.supabaseConfigured).toBe(true);
      expect(info.manifestUrl).toBe('http://localhost:7000/manifest.json');
    });
  });

  describe('adminAnalytics and topMovieMetric', () => {
    it('creates default TopMovieMetric', () => {
      const metric = ModelMocker.topMovieMetric();

      expect(metric.id).toBe('tt0000001');
      expect(metric.userCount).toBe(42);
      expect(metric.readyCount).toBe(35);
    });

    it('creates default AdminAnalyticsData snapshot', () => {
      const analytics = ModelMocker.adminAnalytics();

      expect(analytics.kpis.totalUsers).toBe(25);
      expect(analytics.kpis.readyWatchlistItems).toBe(90);
      expect(analytics.topMovies.length).toBe(2);
      expect(analytics.pollResults.totalVotes).toBe(10);
      expect(analytics.serviceAdoption.watchedSync.trackWatchlistPercent).toBe(96);
    });

    it('allows overriding specific analytics fields', () => {
      const customAnalytics = ModelMocker.adminAnalytics({
        kpis: {
          totalUsers: 50,
          activeUsers24h: 20,
          activeUsers7d: 35,
          activeUsers30d: 48,
          totalWatchlistItems: 300,
          totalTrackedItems: 400,
          readyWatchlistItems: 250,
          waitingWatchlistItems: 50,
          watchedWatchlistItems: 100,
          avgMoviesPerUser: 6.0,
          totalCustomLists: 20,
        },
      });

      expect(customAnalytics.kpis.totalUsers).toBe(50);
      expect(customAnalytics.kpis.readyWatchlistItems).toBe(250);
    });
  });
});
