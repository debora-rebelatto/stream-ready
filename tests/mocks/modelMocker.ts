import type {
  WatchlistItem,
  WatchlistStats,
  SearchMovieResult,
  StremioUser,
  CustomList,
  CuratedList,
  CuratedListItem,
  AppSettings,
  ServerInfo,
  ToastMessage,
  AdminAnalyticsData,
  TopMovieMetric,
} from '../../src/models';

import type {
  CinemetaItem,
  CinemetaDetail,
  StreamItem,
  ParsedStreams,
  QualityCheckResult,
  StremioWatchedMovie,
} from '../../server/types';

/**
 * Sequential and deterministic ID generator for mock entities.
 * Ensures consistent, predictable, and valid identifier formats.
 */
export class IdMocker {
  private static counters = new Map<string, number>();

  private static getNextNumber(entity: string): number {
    const current = this.counters.get(entity) ?? 0;
    const next = current + 1;
    this.counters.set(entity, next);
    return next;
  }

  /**
   * Generates sequential IMDb IDs (e.g. tt0000001, tt0000002)
   */
  static imdb(): string {
    const num = this.getNextNumber('imdb');
    return `tt${String(num).padStart(7, '0')}`;
  }

  /**
   * Generates deterministic, RFC4122-compliant UUIDs
   * e.g. 00000000-0000-4000-8000-000000000001
   */
  static uuid(): string {
    const num = this.getNextNumber('uuid');
    const hex = num.toString(16).padStart(12, '0');
    return `00000000-0000-4000-8000-${hex}`;
  }

  /**
   * Alias for uuid() representing Stremio / database user IDs
   */
  static user(): string {
    return this.uuid();
  }

  /**
   * Generates custom list identifiers (e.g. list_001, list_002)
   */
  static customList(): string {
    const num = this.getNextNumber('customList');
    return `list_${String(num).padStart(3, '0')}`;
  }

  /**
   * Generates mock Stremio auth tokens
   */
  static authKey(): string {
    const num = this.getNextNumber('authKey');
    return `stremio_auth_token_${String(num).padStart(4, '0')}`;
  }

  /**
   * Generates UI toast notification IDs
   */
  static toast(): string {
    const num = this.getNextNumber('toast');
    return `toast_${num}`;
  }

  /**
   * Resets all sequential counters back to zero (ideal for beforeEach).
   */
  static reset(): void {
    this.counters.clear();
  }
}

/**
 * Type-safe Factory / Mocker for all domain models and external schemas.
 * Produces complete, valid instances with deterministic default values and partial overrides.
 */
export class ModelMocker {
  /**
   * Creates a mock WatchlistItem (movie tracked on a personal watchlist)
   */
  static watchlistItem(partial?: Partial<WatchlistItem>): WatchlistItem {
    const id = partial?.id ?? IdMocker.imdb();
    const userId = partial?.userId ?? IdMocker.user();

    const base: WatchlistItem = {
      id,
      userId,
      type: 'movie',
      name: `Mock Movie ${id}`,
      year: 2024,
      poster: `https://images.metahub.space/poster/medium/${id}/img.jpg`,
      banner: `https://images.metahub.space/background/medium/${id}/img.jpg`,
      genres: ['Action', 'Sci-Fi'],
      description: `Description for ${id}`,
      imdbRating: '7.8',
      addedAt: new Date('2024-01-01T12:00:00.000Z').toISOString(),
      has1080pPlus: true,
      bestQuality: '1080p',
      streamCount: 5,
      count1080pPlus: 3,
      lastChecked: new Date('2024-01-02T12:00:00.000Z').toISOString(),
      checkError: null,
      readyAt: new Date('2024-01-02T12:00:00.000Z').toISOString(),
      isWatched: false,
      watchedAt: null,
      minQuality: '1080p',
      customLists: [],
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock StremioUser
   */
  static user(partial?: Partial<StremioUser>): StremioUser {
    const id = partial?.id ?? IdMocker.user();
    const base: StremioUser = {
      id,
      email: `user_${id.slice(-6)}@example.com`,
      isAdmin: false,
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock CustomList
   */
  static customList(partial?: Partial<CustomList>): CustomList {
    const id = partial?.id ?? IdMocker.customList();
    const userId = partial?.userId ?? IdMocker.user();

    const base: CustomList = {
      id,
      userId,
      name: `Custom List ${id}`,
      emoji: '🍿',
      createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
      itemsCount: 0,
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock CuratedListItem
   */
  static curatedListItem(partial?: Partial<CuratedListItem>): CuratedListItem {
    const id = partial?.id ?? IdMocker.imdb();
    const base: CuratedListItem = {
      id,
      name: `Curated Film ${id}`,
      year: 2024,
      poster: `https://images.metahub.space/poster/medium/${id}/img.jpg`,
      banner: `https://images.metahub.space/background/medium/${id}/img.jpg`,
      genres: ['Drama'],
      description: `Curated movie description for ${id}`,
      imdbRating: '8.2',
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock CuratedList
   */
  static curatedList(partial?: Partial<CuratedList>): CuratedList {
    const id = partial?.id ?? `curated_${IdMocker.customList()}`;
    const base: CuratedList = {
      id,
      name: 'Essential Sci-Fi Classics',
      emoji: '🚀',
      platform: 'community',
      badge: 'Trending',
      color: '#7b42f6',
      gradient: 'from-purple-900/60 to-purple-600/30',
      description: 'Handpicked top-tier sci-fi masterpieces',
      items: [
        this.curatedListItem({ id: 'tt0133093', name: 'The Matrix' }),
        this.curatedListItem({ id: 'tt0816692', name: 'Interstellar' }),
      ],
      itemsCount: 2,
      isAdded: false,
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates mock user AppSettings
   */
  static settings(partial?: Partial<AppSettings>): AppSettings {
    const base: AppSettings = {
      stremioAuthKey: IdMocker.authKey(),
      minQuality: '1080p',
      autoSyncWatched: false,
      trackWatchlistWatched: true,
      syncPreviouslyWatched: false,
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock WatchlistStats counter snapshot
   */
  static watchlistStats(partial?: Partial<WatchlistStats>): WatchlistStats {
    const base: WatchlistStats = {
      total: 10,
      ready: 6,
      pending: 2,
      unreleased: 1,
      watched: 1,
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock SearchMovieResult
   */
  static searchMovieResult(partial?: Partial<SearchMovieResult>): SearchMovieResult {
    const id = partial?.id ?? IdMocker.imdb();
    const base: SearchMovieResult = {
      id,
      type: 'movie',
      name: `Search Result ${id}`,
      year: 2024,
      poster: `https://images.metahub.space/poster/medium/${id}/img.jpg`,
      banner: `https://images.metahub.space/background/medium/${id}/img.jpg`,
      genres: ['Thriller'],
      description: 'Search synopsis',
      imdbRating: '7.5',
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock CinemetaItem object
   */
  static cinemetaItem(partial?: Partial<CinemetaItem>): CinemetaItem {
    const id = partial?.id ?? IdMocker.imdb();
    const base: CinemetaItem = {
      id,
      type: 'movie',
      name: `Cinemeta Item ${id}`,
      year: '2024',
      poster: `https://images.metahub.space/poster/medium/${id}/img.jpg`,
      banner: `https://images.metahub.space/background/medium/${id}/img.jpg`,
      genres: ['Action'],
      description: `Description for ${id}`,
      imdbRating: '7.9',
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock ParsedStreams object
   */
  static parsedStreams(partial?: Partial<ParsedStreams>): ParsedStreams {
    const base: ParsedStreams = {
      has1080pPlus: true,
      isReady: true,
      isCamOnly: false,
      isUnreleased: false,
      bestQuality: '1080p',
      streamCount: 8,
      cleanStreamCount: 8,
      count1080pPlus: 4,
      checkedAt: new Date().toISOString(),
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock QualityCheckResult (Torrentio / stream parser result)
   */
  static qualityCheckResult(partial?: Partial<QualityCheckResult>): QualityCheckResult {
    const base: QualityCheckResult = {
      has1080pPlus: true,
      isReady: true,
      isCamOnly: false,
      isUnreleased: false,
      bestQuality: '1080p',
      streamCount: 4,
      cleanStreamCount: 4,
      count1080pPlus: 2,
      checkedAt: new Date().toISOString(),
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock StreamItem returned by Torrentio
   */
  static streamItem(partial?: Partial<StreamItem>): StreamItem {
    const base: StreamItem = {
      name: 'Torrentio\n1080p',
      title: 'Movie.2024.1080p.WEB-DL.DDP5.1.Atmos.H.264\n💾 4.5 GB',
      behaviorHints: {
        bingeGroup: 'torrentio-1080p',
        filename: 'Movie.2024.1080p.mkv',
      },
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock CinemetaDetail object
   */
  static cinemetaDetail(partial?: Partial<CinemetaDetail>): CinemetaDetail {
    const id = partial?.id ?? IdMocker.imdb();
    const base: CinemetaDetail = {
      id,
      type: 'movie',
      name: `Cinemeta Movie ${id}`,
      year: '2024',
      poster: `https://images.metahub.space/poster/medium/${id}/img.jpg`,
      banner: `https://images.metahub.space/background/medium/${id}/img.jpg`,
      genres: ['Adventure', 'Drama'],
      description: `Full synopsis for ${id}`,
      imdbRating: '8.0',
      runtime: '120 min',
      director: ['Christopher Nolan'],
      cast: ['Actor One', 'Actor Two'],
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock StremioWatchedMovie object
   */
  static stremioWatchedMovie(partial?: Partial<StremioWatchedMovie>): StremioWatchedMovie {
    const id = partial?.id ?? IdMocker.imdb();
    const base: StremioWatchedMovie = {
      id,
      name: `Watched Film ${id}`,
      year: '2023',
      poster: `https://images.metahub.space/poster/medium/${id}/img.jpg`,
      type: 'movie',
      isWatched: true,
      watchedAt: new Date('2024-01-01T20:00:00.000Z').toISOString(),
      addedAt: new Date('2023-12-01T10:00:00.000Z').toISOString(),
      has1080pPlus: true,
      bestQuality: '1080p',
      streamCount: 6,
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock ToastMessage for UI toast tests
   */
  static toast(partial?: Partial<ToastMessage>): ToastMessage {
    const base: ToastMessage = {
      id: IdMocker.toast(),
      message: 'Operation succeeded',
      type: 'success',
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock ServerInfo object
   */
  static serverInfo(partial?: Partial<ServerInfo>): ServerInfo {
    const base: ServerInfo = {
      baseUrl: 'http://localhost:7000',
      manifestUrl: 'http://localhost:7000/manifest.json',
      stremioInstallUrl: 'stremio://localhost:7000/manifest.json',
      webStremioInstallUrl: 'https://web.stremio.com/#/addons?addon=http%3A%2F%2Flocalhost%3A7000%2Fmanifest.json',
      supabaseConfigured: true,
      port: 7000,
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock TopMovieMetric
   */
  static topMovieMetric(partial?: Partial<TopMovieMetric>): TopMovieMetric {
    const id = partial?.id ?? IdMocker.imdb();
    const base: TopMovieMetric = {
      id,
      name: `Popular Movie ${id}`,
      poster: `https://images.metahub.space/poster/medium/${id}/img.jpg`,
      userCount: 42,
      readyCount: 35,
      bestQuality: '1080p',
    };

    return Object.assign(base, partial);
  }

  /**
   * Creates a mock AdminAnalyticsData snapshot
   */
  static adminAnalytics(partial?: Partial<AdminAnalyticsData>): AdminAnalyticsData {
    const base: AdminAnalyticsData = {
      kpis: {
        totalUsers: 25,
        activeUsers24h: 8,
        activeUsers7d: 15,
        activeUsers30d: 22,
        totalWatchlistItems: 140,
        totalTrackedItems: 180,
        readyWatchlistItems: 90,
        waitingWatchlistItems: 50,
        watchedWatchlistItems: 40,
        avgMoviesPerUser: 5.6,
        totalCustomLists: 12,
      },
      serviceAdoption: {
        addon: {
          manifestCopiedCount: 30,
          installClickedCount: 22,
          qrScannedCount: 14,
        },
        watchedSync: {
          trackWatchlistUsers: 24,
          trackWatchlistPercent: 96,
          autoSyncUsers: 18,
          autoSyncPercent: 72,
          syncPreviouslyWatchedUsers: 12,
          syncPreviouslyWatchedPercent: 48,
        },
        quality: {
          quality1080pUsers: 20,
          quality4kUsers: 5,
          quality1080pPercent: 80,
          quality4kPercent: 20,
        },
        customLists: {
          usersWithCustomLists: 7,
          curatedListAddedEvents: 15,
        },
      },
      topMovies: [
        this.topMovieMetric({ id: 'tt1111111', name: 'Dune: Part Two', userCount: 18 }),
        this.topMovieMetric({ id: 'tt2222222', name: 'Oppenheimer', userCount: 14 }),
      ],
      pollResults: {
        totalVotes: 10,
        breakdown: [
          { option: 'TV Shows support', count: 6, percentage: 60 },
          { option: 'Letterboxd Import', count: 4, percentage: 40 },
        ],
        customFeedback: [
          {
            customText: 'Please integrate Trakt.tv automatic sync!',
            createdAt: new Date().toISOString(),
          },
        ],
      },
      eventsBreakdown: [
        { eventName: 'addon_install_clicked', count: 22 },
        { eventName: 'quality_filter_changed', count: 18 },
      ],
      recentEvents: [
        {
          eventName: 'addon_install_clicked',
          createdAt: new Date().toISOString(),
          metadata: { source: 'landing_hero' },
        },
      ],
      generatedAt: new Date().toISOString(),
    };

    return Object.assign(base, partial);
  }
}
