export interface KpiMetrics {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalWatchlistItems: number;
  totalTrackedItems?: number;
  readyWatchlistItems: number;
  waitingWatchlistItems: number;
  watchedWatchlistItems: number;
  avgMoviesPerUser: number;
  totalCustomLists: number;
}

export interface ServiceAdoptionMetrics {
  addon: {
    manifestCopiedCount: number;
    installClickedCount: number;
    qrScannedCount: number;
  };
  watchedSync: {
    trackWatchlistUsers: number;
    trackWatchlistPercent: number;
    autoSyncUsers: number;
    autoSyncPercent: number;
    syncPreviouslyWatchedUsers: number;
    syncPreviouslyWatchedPercent: number;
  };
  quality: {
    quality1080pUsers: number;
    quality4kUsers: number;
    quality1080pPercent: number;
    quality4kPercent: number;
  };
  customLists: {
    usersWithCustomLists: number;
    curatedListAddedEvents: number;
  };
}

export interface TopMovieMetric {
  id: string;
  name: string;
  year?: string | number;
  userCount: number;
  readyCount: number;
  poster?: string;
  bestQuality?: string;
}

export interface PollFeedbackMetric {
  option: string;
  count: number;
  percentage: number;
}

export interface PollCustomFeedback {
  customText: string;
  createdAt?: string;
}

export interface EventBreakdownMetric {
  eventName: string;
  count: number;
}

export interface RecentEventMetric {
  eventName: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface AdminAnalyticsData {
  kpis: KpiMetrics;
  serviceAdoption: ServiceAdoptionMetrics;
  topMovies: TopMovieMetric[];
  pollResults: {
    totalVotes: number;
    breakdown: PollFeedbackMetric[];
    customFeedback: PollCustomFeedback[];
  };
  eventsBreakdown: EventBreakdownMetric[];
  recentEvents: RecentEventMetric[];
  generatedAt: string;
}
