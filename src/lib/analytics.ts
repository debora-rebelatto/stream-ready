import posthog from 'posthog-js';
import { getAuthHeaders } from './api';

export type EventSource = 'search' | 'recommendations' | 'curated_list' | 'manual';
export type AddonActionLocation = 'navbar' | 'landing_page' | 'hero';

export interface EventDataMap {
  movie_added: { title: string; year?: string; imdbId?: string; source?: EventSource; isReady?: boolean };
  movie_removed: { title: string; imdbId?: string };
  movie_watched_toggled: { isWatched: boolean; imdbId?: string };
  addon_manifest_copied: { location: AddonActionLocation };
  addon_install_clicked: { location: AddonActionLocation };
  search_query_performed: { resultsCount: number };
  filter_tab_switched: { tab: string };
  sort_changed: { sortBy: string };
  quality_setting_updated: { minQuality: string; scope?: 'global' | 'item'; imdbId?: string };
  sync_setting_updated: { setting: string; enabled: boolean };
  recheck_all_triggered: { totalItems?: number; newlyReady?: number };
  custom_list_created: { listName: string };
  curated_list_added: { listName: string; addedMoviesCount?: number };
  auth_login_success: { method: 'credentials' | 'authKey' };
  auth_logout: { reason?: string } | Record<string, never>;
  account_deleted: Record<string, never>;
  feedback_link_clicked: { location: string };
  sponsor_clicked: { location: string };
  poll_voted: { option: string; hasCustomText: boolean };
  poll_dismissed: { reason?: string };
  onboarding_viewed: { watchlistCount: number };
  onboarding_quick_add_clicked: { movieIds: string[]; source: string };
  onboarding_dismissed: { reason?: string };
  qr_code_scanned: { source: string; context?: string; userAgent?: string };
}

export type EventName = keyof EventDataMap;

export const TRACKING_DISABLED_KEY = 'stremio_tracking_disabled';
export const EXCLUDED_EMAILS_KEY = 'stremio_excluded_tracking_emails';

// Built-in excluded accounts (empty by default; configure via EXCLUDED_TRACKING_* env vars)
export const BUILTIN_EXCLUDED_EMAILS: string[] = [];
export const BUILTIN_EXCLUDED_USER_IDS: string[] = [];

let isPostHogInitialized = false;

/**
 * Safe localStorage wrapper that never throws in sandboxed or restricted contexts.
 */
const safeStorage = {
  get(key: string): string | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {}
  },
  remove(key: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch {}
  }
};

/**
 * Safely resolves an environment variable from process.env (Node / Vite define) or window globals.
 */
function getEnvVar(key: string): string {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as Record<string, string | undefined>)[key] || '';
    }
  } catch {}
  return '';
}

/**
 * Parses and returns the list of excluded emails from environment variables and localStorage.
 */
export function getExcludedTrackingEmails(): string[] {
  const emailsSet = new Set<string>(BUILTIN_EXCLUDED_EMAILS.map((e) => e.toLowerCase()));

  // 1. From environment variables (Vite / Node)
  const envVal = getEnvVar('VITE_EXCLUDED_TRACKING_EMAILS') || getEnvVar('EXCLUDED_TRACKING_EMAILS');
  if (envVal) {
    envVal.split(',').forEach((email) => {
      const clean = email.trim().toLowerCase();
      if (clean) emailsSet.add(clean);
    });
  }

  // 2. From localStorage
  const stored = safeStorage.get(EXCLUDED_EMAILS_KEY);
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

  return Array.from(emailsSet);
}

/**
 * Parses and returns the list of excluded user IDs from environment variables.
 */
export function getExcludedTrackingUserIds(): string[] {
  const idsSet = new Set<string>(BUILTIN_EXCLUDED_USER_IDS.map((id) => id.toLowerCase()));

  const envVal = getEnvVar('VITE_EXCLUDED_TRACKING_USER_IDS') || getEnvVar('EXCLUDED_TRACKING_USER_IDS');
  if (envVal) {
    envVal.split(',').forEach((id) => {
      const clean = id.trim().toLowerCase();
      if (clean) idsSet.add(clean);
    });
  }

  return Array.from(idsSet);
}

/**
 * Saves list of excluded emails to localStorage and immediately opts out if current user is excluded.
 */
export function setExcludedTrackingEmails(emails: string[]): void {
  const cleanList = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  safeStorage.set(EXCLUDED_EMAILS_KEY, JSON.stringify(cleanList));

  // If current logged-in user is in excluded list, opt out immediately
  const currentEmail = safeStorage.get('stremioEmail')?.trim().toLowerCase();
  if (currentEmail && (cleanList.includes(currentEmail) || isTrackingBlocked(currentEmail))) {
    try {
      posthog.opt_out_capturing?.();
    } catch {}
  }
}

/**
 * Checks whether tracking/telemetry is completely blocked for the current session or a specific user.
 */
export function isTrackingBlocked(targetEmailOrId?: string): boolean {
  // 1. Explicit global opt-out toggle in localStorage
  if (safeStorage.get(TRACKING_DISABLED_KEY) === 'true') {
    return true;
  }

  const excludedEmails = getExcludedTrackingEmails();
  const excludedIds = getExcludedTrackingUserIds();

  // 2. Target email or user ID check
  if (targetEmailOrId) {
    const target = String(targetEmailOrId).trim().toLowerCase();
    if (excludedEmails.includes(target) || excludedIds.includes(target)) {
      return true;
    }
  }

  // 3. Current authenticated user in localStorage
  const currentEmail = safeStorage.get('stremioEmail')?.trim().toLowerCase();
  if (currentEmail && excludedEmails.includes(currentEmail)) {
    return true;
  }

  return false;
}

/**
 * Sets the global tracking disabled opt-out state.
 */
export function setTrackingDisabled(disabled: boolean): void {
  safeStorage.set(TRACKING_DISABLED_KEY, disabled ? 'true' : 'false');
  try {
    if (disabled) {
      posthog.opt_out_capturing?.();
    } else {
      posthog.opt_in_capturing?.();
    }
  } catch {}
}

/**
 * Initializes PostHog with API key from environment, window globals, or parameter.
 */
export function initPostHog(apiKey?: string, host?: string): void {
  if (typeof window === 'undefined' || isPostHogInitialized) return;

  if (isTrackingBlocked()) {
    try {
      posthog.opt_out_capturing?.();
    } catch {}
    return;
  }

  const key = apiKey || getEnvVar('VITE_POSTHOG_KEY') || (window as any).__POSTHOG_KEY__;
  const apiHost =
    host ||
    getEnvVar('VITE_POSTHOG_HOST') ||
    (window as any).__POSTHOG_HOST__ ||
    'https://us.i.posthog.com';

  if (!key) return;

  try {
    posthog.init(key, {
      api_host: apiHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
    });
    isPostHogInitialized = true;
  } catch {
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
      posthog.identify?.(userId, traits);
    }
  } catch {}
}

/**
 * Resets user session identity on logout.
 */
export function resetUser(): void {
  try {
    if (isPostHogInitialized || (posthog as any).__loaded) {
      posthog.reset?.();
    }
  } catch {}
}

/**
 * Dispatches a typed event to:
 * 1. PostHog (Product analytics, funnels, session replays)
 * 2. Supabase backend (/api/events - First-party, privacy-preserving, anti-adblock)
 */
export function trackEvent<T extends EventName>(
  name: T,
  data?: EventDataMap[T]
): void {
  if (isTrackingBlocked()) {
    return;
  }

  const payload = (data || {}) as Record<string, any>;

  // 1. PostHog
  try {
    if (isPostHogInitialized || (posthog as any).__loaded) {
      posthog.capture?.(name, payload);
    }
  } catch {}

  // 2. First-party server analytics (/api/events)
  try {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/api/events', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ event: name, data: payload }),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}

  // 3. Local dev debug log (only in development, not during tests)
  try {
    const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log(`[Analytics] Event: "${name}"`, payload);
    }
  } catch {}
}
