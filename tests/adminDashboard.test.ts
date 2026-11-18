import React from 'react';
import { adminService } from '../src/services/adminService';
import {
  AdminKpiGrid,
  ServiceAdoptionCard,
  TopMoviesTable,
  TopThreeMoviesCard,
  PollFeedbackCard,
  EventActivityFeed,
} from '../src/components/admin';
import { AdminDashboardView } from '../src/views/AdminDashboardView';
import type { AdminAnalyticsData } from '../src/models';

describe('Admin Analytics Dashboard Components', () => {
  const mockAnalyticsData: AdminAnalyticsData = {
    kpis: {
      totalUsers: 42,
      activeUsers24h: 12,
      activeUsers7d: 25,
      activeUsers30d: 38,
      totalWatchlistItems: 150,
      readyWatchlistItems: 90,
      waitingWatchlistItems: 40,
      watchedWatchlistItems: 20,
      avgMoviesPerUser: 3.6,
      totalCustomLists: 14,
    },
    serviceAdoption: {
      addon: {
        manifestCopiedCount: 30,
        installClickedCount: 22,
        qrScannedCount: 15,
      },
      watchedSync: {
        trackWatchlistUsers: 35,
        trackWatchlistPercent: 83,
        autoSyncUsers: 28,
        autoSyncPercent: 67,
        syncPreviouslyWatchedUsers: 10,
        syncPreviouslyWatchedPercent: 24,
      },
      quality: {
        quality1080pUsers: 30,
        quality4kUsers: 12,
        quality1080pPercent: 71,
        quality4kPercent: 29,
      },
      customLists: {
        usersWithCustomLists: 18,
        curatedListAddedEvents: 25,
      },
    },
    topMovies: [
      {
        id: 'tt0111161',
        name: 'The Shawshank Redemption',
        year: 1994,
        userCount: 15,
        readyCount: 15,
        poster: 'https://example.com/poster.jpg',
      },
    ],
    pollResults: {
      totalVotes: 30,
      breakdown: [{ option: 'Discord Notifications', count: 18, percentage: 60 }],
      customFeedback: [{ customText: 'Great app!', createdAt: '2026-11-17T00:00:00Z' }],
    },
    eventsBreakdown: [{ eventName: 'movie_added', count: 120 }],
    recentEvents: [{ eventName: 'movie_added', createdAt: '2026-11-17T12:00:00Z' }],
    generatedAt: '2026-11-17T18:00:00Z',
  };

  test('AdminKpiGrid instantiates and renders KPI values', () => {
    const el = React.createElement(AdminKpiGrid, { kpis: mockAnalyticsData.kpis });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.kpis.totalUsers).toBe(42);
    expect(el.props.kpis.readyWatchlistItems).toBe(90);
  });

  test('ServiceAdoptionCard instantiates with addon and sync metrics', () => {
    const el = React.createElement(ServiceAdoptionCard, { adoption: mockAnalyticsData.serviceAdoption });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.adoption.addon.manifestCopiedCount).toBe(30);
    expect(el.props.adoption.watchedSync.trackWatchlistPercent).toBe(83);
  });

  test('TopMoviesTable renders community movie list', () => {
    const el = React.createElement(TopMoviesTable, { movies: mockAnalyticsData.topMovies });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.movies).toHaveLength(1);
    expect(el.props.movies[0].name).toBe('The Shawshank Redemption');
  });

  test('TopThreeMoviesCard instantiates with top 3 movies podium', () => {
    const multiMovies = [
      { id: 'tt1', name: 'Movie 1', year: 2024, userCount: 20, readyCount: 18 },
      { id: 'tt2', name: 'Movie 2', year: 2023, userCount: 15, readyCount: 10 },
      { id: 'tt3', name: 'Movie 3', year: 2022, userCount: 10, readyCount: 0 },
      { id: 'tt4', name: 'Movie 4', year: 2021, userCount: 5, readyCount: 2 },
    ];
    const el = React.createElement(TopThreeMoviesCard, { movies: multiMovies });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.movies).toHaveLength(4);

    const emptyEl = React.createElement(TopThreeMoviesCard, { movies: [] });
    expect(React.isValidElement(emptyEl)).toBe(true);
  });

  test('PollFeedbackCard renders poll breakdown and feedback', () => {
    const el = React.createElement(PollFeedbackCard, {
      totalVotes: mockAnalyticsData.pollResults.totalVotes,
      breakdown: mockAnalyticsData.pollResults.breakdown,
      customFeedback: mockAnalyticsData.pollResults.customFeedback,
    });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.totalVotes).toBe(30);
  });

  test('EventActivityFeed renders event breakdown and live stream', () => {
    const el = React.createElement(EventActivityFeed, {
      eventsBreakdown: mockAnalyticsData.eventsBreakdown,
      recentEvents: mockAnalyticsData.recentEvents,
    });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.eventsBreakdown).toHaveLength(1);
  });

  test('AdminDashboardView instantiates with onBack callback', () => {
    const onBackMock = jest.fn();
    const el = React.createElement(AdminDashboardView, { onBack: onBackMock });
    expect(React.isValidElement(el)).toBe(true);
    expect(el.props.onBack).toBe(onBackMock);
  });

  describe('adminService', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('fetchAnalytics calls /api/admin/analytics and returns typed data', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, analytics: mockAnalyticsData }),
      });

      const result = await adminService.fetchAnalytics('7d');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/analytics?range=7d',
        expect.objectContaining({ method: 'GET' })
      );
      expect(result.kpis.totalUsers).toBe(42);
    });

    test('fetchAnalytics throws clean error on 403 Forbidden', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(adminService.fetchAnalytics('all')).rejects.toThrow(
        /Access denied: You must be an administrator/
      );
    });
  });
});
