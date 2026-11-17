import posthog from 'posthog-js';
import { getAuthHeaders } from './api';

export type EventSource = 'search' | 'recommendations' | 'curated_list' | 'manual';
export type AddonActionLocation = 'navbar' | 'landing_page' | 'hero';

export interface EventDataMap {
  movie_added: { title: string; year?: string; imdbId?: string; source?: EventSource };
  movie_removed: { title: string; imdbId?: string };
  movie_watched_toggled: { isWatched: boolean; imdbId?: string };
  addon_manifest_copied: { location: AddonActionLocation };
  addon_install_clicked: { location: AddonActionLocation };
  search_query_performed: { resultsCount: number };
  filter_tab_switched: { tab: string };
  sort_changed: { sortBy: string };
  quality_setting_updated: { minQuality: '1080p' | '4k' };
  sync_setting_updated: { setting: string; enabled: boolean };
  recheck_all_triggered: { totalItems?: number };
  custom_list_created: { listName: string };
  curated_list_added: { listName: string };
  auth_login_success: { method: 'credentials' | 'authKey' };
  auth_logout: Record<string, never>;
  feedback_link_clicked: { location: string };
  sponsor_clicked: { location: string };
  poll_voted: { option: string; hasCustomText: boolean };
  poll_dismissed: { reason?: string };
}

export type EventName = keyof EventDataMap;

let isPostHogInitialized = false;

/**
 * Initializes PostHog with API key from environment or parameter.
 * Default host points to US PostHog cloud: https://us.i.posthog.com
 */
export function initPostHog(apiKey?: string, host?: string): void {
  if (typeof window === 'undefined') return;

  const key = apiKey || (typeof process !== 'undefined' ? process.env.VITE_POSTHOG_KEY : '') || (window as any).__POSTHOG_KEY__;
  const apiHost = host || (typeof process !== 'undefined' ? process.env.VITE_POSTHOG_HOST : '') || (window as any).__POSTHOG_HOST__ || 'https://us.i.posthog.com';

  if (!key) {
    return;
  }

  try {
    posthog.init(key, {
      api_host: apiHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
    });
    isPostHogInitialized = true;
  } catch (err) {
    // Fail silently to never impact user experience
  }
}

/**
 * Identifies a logged-in user in PostHog.
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  try {
    if (isPostHogInitialized) {
      posthog.identify(userId, traits);
    }
  } catch {}
}

/**
 * Resets user session identity on logout.
 */
export function resetUser(): void {
  try {
    if (isPostHogInitialized) {
      posthog.reset();
    }
  } catch {}
}

/**
 * Dispatches a typed event to:
 * 1. PostHog (Product analytics, funnels, session replays)
 * 2. Supabase backend (/api/events - First-party, 100% free, anti-adblock)
 * 3. Vercel Analytics (when enabled)
 */
export function trackEvent<T extends EventName>(
  name: T,
  data?: EventDataMap[T]
): void {
  const payload = (data || {}) as Record<string, any>;

  // 1. PostHog
  try {
    if (isPostHogInitialized) {
      posthog.capture(name, payload);
    }
  } catch {}

  // 2. Supabase First-Party Analytics (/api/events)
  try {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/api/events', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ event: name, data: payload }),
        keepalive: true
      }).catch(() => {});
    }
  } catch {}

  // 3. Local dev debug log
  try {
    const isDev = typeof process !== 'undefined'
      ? process.env.NODE_ENV !== 'production'
      : false;
    if (isDev) {
      console.log(`[Analytics] Event: "${name}"`, payload);
    }
  } catch {}
}
