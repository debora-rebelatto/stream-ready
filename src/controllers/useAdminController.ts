import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services';
import type { AdminAnalyticsData } from '../models';

export type AdminTab = 'overview' | 'adoption' | 'movies' | 'feedback';
export type AdminTimeRange = '7d' | '30d' | 'all';

export interface UseAdminControllerProps {
  onBack?: () => void;
}

export function useAdminController({ onBack }: UseAdminControllerProps = {}) {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<AdminTimeRange>('all');
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const loadData = useCallback(async (range: AdminTimeRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const analytics = await adminService.fetchAnalytics(range);
      setData(analytics);
    } catch (err: any) {
      setError(err.message || 'Failed to load admin analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(timeRange);
  }, [loadData, timeRange]);

  const handleRefresh = async () => {
    await loadData(timeRange);
  };

  return {
    data,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    activeTab,
    setActiveTab,
    handleRefresh,
    onBack,
  };
}
