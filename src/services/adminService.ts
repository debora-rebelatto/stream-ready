import { getAuthHeaders } from '../utils/httpClient';
import type { AdminAnalyticsData } from '../models';

export const adminService = {
  /**
   * Fetches aggregated admin analytics including service adoption funnels,
   * active user counts, feature usage, and top community movies.
   */
  async fetchAnalytics(timeRange: '7d' | '30d' | 'all' = 'all'): Promise<AdminAnalyticsData> {
    const res = await fetch(`/api/admin/analytics?range=${encodeURIComponent(timeRange)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Access denied: You must be an administrator to view this dashboard.');
      }
      throw new Error(`Failed to load admin analytics (Status: ${res.status})`);
    }

    const data = await res.json();
    if (!data.success || !data.analytics) {
      throw new Error(data.error || 'Failed to retrieve analytics data');
    }

    return data.analytics as AdminAnalyticsData;
  },
};
