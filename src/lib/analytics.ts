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

export const TRACKING_DISABLED_KEY = 'stremio_tracking_disabled';
export const EXCLUDED_EMAILS_KEY = 'stremio_excluded_tracking_emails';

let isPostHogInitialized = false;

/**
 * Parses and returns the list of excluded emails from environment variables and localStorage.
 */
export function getExcludedTrackingEmails(): string[] {
  const emailsSet = new Set<string>();

  // 1. From Vite / process environment
  const envVal = (typeof process !== 'undefined'
    ? process.env.VITE_EXCLUDED_TRACKING_EMAILS || process.env.EXCLUDED_TRACKING_EMAILS
    : '') || (typeof window !== 'undefined' ? (window as any).__EXCLUDED_EMAILS__ : '') || '';

  if (envVal) {
    envVal.split(',').forEach((email) => {
      const clean = email.trim().toLowerCase();
      if (clean) emailsSet.add(clean);
    });
  }

  // 2. From localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(EXCLUDED_EMAILS_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((e) => {
              const clean = String(e).trim().toLowerCase();
              if (clean) emailsSet.add(clean);
            });
          }
        } catch {
          stored.split(',').forEach((e) => {
            const clean = e.trim().toLowerCase();
            if (clean) emailsSet.add(clean);
          });
        }
      }
    }
  } catch {}

  return Array.from(emailsSet);
}

/**
 * Saves list of excluded emails to localStorage.
 */
export function setExcludedTrackingEmails(emails: string[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const cleanList = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
      localStorage.setItem(EXCLUDED_EMAILS_KEY, JSON.stringify(cleanList));

      // If current user is in the list, opt out immediately
      const currentEmail = localStorage.getItem('stremioEmail')?.toLowerCase().trim();
      if (currentEmail && cleanList.includes(currentEmail)) {
        try {
          posthog.opt_out_capturing?.();
        } catch {}
      }
    }
  } catch {}
}

/**
 * Checks whether tracking/telemetry is completely blocked.
 */
export function isTrackingBlocked(targetEmailOrId?: string): boolean {
  try {
    // 1. Explicit global opt-out toggle in localStorage
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem(TRACKING_DISABLED_KEY) === 'true') {
        return true;
      }
    }

    const excluded = getExcludedTrackingEmails();
    if (excluded.length === 0) return false;

    // 2. Target email or ID check
    if (targetEmailOrId) {
      const target = String(targetEmailOrId).trim().toLowerCase();
      if (excluded.includes(target)) {
        return true;
      }
    }

    // 3. Current authenticated user in localStorage
    if (typeof localStorage !== 'undefined') {
      const currentEmail = localStorage.getItem('stremioEmail')?.trim().toLowerCase();
      if (currentEmail && excluded.includes(currentEmail)) {
        return true;
      }
    }
  } catch {}

  return false;
}

/**
 * Sets the global tracking disabled opt-out state.
 */
export function setTrackingDisabled(disabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TRACKING_DISABLED_KEY, disabled ? 'true' : 'false');
    }
    if (disabled) {
      try {
        posthog.opt_out_capturing?.();
      } catch {}
    } else {
      try {
        posthog.opt_in_capturing?.();
      } catch {}
    }
  } catch {}
}

/**
 * Initializes PostHog with API key from environment or parameter.
 * Default host points to US PostHog cloud: https://us.i.posthog.com
 */
export function initPostHog(apiKey?: string, host?: string): void {
  if (typeof window === 'undefined') return;
  if (isTrackingBlocked()) {
    try {
      posthog.opt_out_capturing?.();
    } catch {}
    return;
  }

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
  if (isTrackingBlocked(userId) || (traits?.email && isTrackingBlocked(traits.email))) {
    try {
      posthog.opt_out_capturing?.();
    } catch {}
    return;
  }

  try {
    if (isPostHogInitialized || (posthog as any).__loaded) {
      posthog.identify(userId, traits);
    }
  } catch {}
}

/**
 * Resets user session identity on logout.
 */
export function resetUser(): void {
  try {
    if (isPostHogInitialized || (posthog as any).__loaded) {
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
  // If user/account is excluded or opted out, block all tracking completely
  if (isTrackingBlocked()) {
    return;
  }

  const payload = (data || {}) as Record<string, any>;

  // 1. PostHog
  try {
    if (isPostHogInitialized || (posthog as any).__loaded) {
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
