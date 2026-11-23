import { getAuthHeaders } from './httpClient';
import { safeStorage } from './safeStorage';

export type EventSource = 'search' | 'recommendations' | 'curated_list' | 'manual';
export type AddonActionLocation =
  | 'navbar'
  | 'landing_page'
  | 'hero'
  | 'dashboard_guide'
  | 'install_modal'
  | 'setup_wizard';

export interface EventDataMap {
  movie_added: {
    title: string;
    year?: string;
    imdbId?: string;
    source?: EventSource;
    isReady?: boolean;
  };
  movie_removed: { title: string; imdbId?: string };
  movie_watched_toggled: { isWatched: boolean; imdbId?: string };
  addon_manifest_copied: { location: AddonActionLocation };
  addon_install_clicked: { location: AddonActionLocation };
  search_query_performed: { resultsCount: number };
  filter_tab_switched: { tab: string };
  sort_changed: { sortBy: string };
  quality_setting_updated: { minQuality: string; scope?: 'global' };
  audio_setting_updated: { minAudio: string; scope?: 'global' };
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
  onboarding_step_viewed: {
    stepId: string;
    stepNumber: number;
    mode: 'first-login' | 'review';
  };
  onboarding_step_completed: {
    stepId: string;
    stepNumber: number;
    actionTaken?: string;
  };
  onboarding_completed: {
    mode: 'first-login' | 'review';
    installedInWizard: boolean;
    moviesAddedCount: number;
    minQuality: '1080p' | '4k';
  };
  qr_code_scanned: { source: string; context?: string; userAgent?: string };
  qr_landing_viewed: { source: string; context?: string; alreadyLoggedIn?: boolean };
  stremio_configure_opened: { source: string; context?: string };
  notification_link_clicked: { channel: string; source: string };
}

export type EventName = keyof EventDataMap;

export const TRACKING_DISABLED_KEY = 'stremio_tracking_disabled';
export const SERVER_TRACKING_EXCLUDED_KEY = 'stremio_server_tracking_excluded';
export const EXCLUDED_EMAILS_KEY = 'stremio_excluded_tracking_emails';

export const BUILTIN_EXCLUDED_EMAILS: string[] = [];
export const BUILTIN_EXCLUDED_USER_IDS: string[] = [];

function isDevMode(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
}

function logAnalyticsError(context: string, err: unknown): void {
  if (isDevMode()) {
    console.warn(`[Analytics] ${context}:`, err);
  }
}

function getEnvVar(key: string): string {
  if (typeof process !== 'undefined' && process.env) {
    return (process.env as Record<string, string | undefined>)[key] || '';
  }
  return '';
}

export function getExcludedTrackingEmails(): string[] {
  const emailsSet = new Set<string>(BUILTIN_EXCLUDED_EMAILS.map((e) => e.toLowerCase()));

  const envVal =
    getEnvVar('VITE_EXCLUDED_TRACKING_EMAILS') || getEnvVar('EXCLUDED_TRACKING_EMAILS');
  if (envVal) {
    envVal.split(',').forEach((email) => {
      const clean = email.trim().toLowerCase();
      if (clean) emailsSet.add(clean);
    });
  }

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

export function getExcludedTrackingUserIds(): string[] {
  const idsSet = new Set<string>(BUILTIN_EXCLUDED_USER_IDS.map((id) => id.toLowerCase()));

  const envVal =
    getEnvVar('VITE_EXCLUDED_TRACKING_USER_IDS') || getEnvVar('EXCLUDED_TRACKING_USER_IDS');
  if (envVal) {
    envVal.split(',').forEach((id) => {
      const clean = id.trim().toLowerCase();
      if (clean) idsSet.add(clean);
    });
  }

  return Array.from(idsSet);
}

export function setExcludedTrackingEmails(emails: string[]): void {
  const cleanList = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
  safeStorage.set(EXCLUDED_EMAILS_KEY, JSON.stringify(cleanList));
}

export function isTrackingBlocked(targetEmailOrId?: string): boolean {
  if (
    safeStorage.get(TRACKING_DISABLED_KEY) === 'true' ||
    safeStorage.get(SERVER_TRACKING_EXCLUDED_KEY) === 'true'
  ) {
    return true;
  }

  const excludedEmails = getExcludedTrackingEmails();
  const excludedIds = getExcludedTrackingUserIds();

  if (targetEmailOrId) {
    const target = String(targetEmailOrId).trim().toLowerCase();
    if (excludedEmails.includes(target) || excludedIds.includes(target)) {
      return true;
    }
  }

  const currentEmail = safeStorage.get('stremioEmail')?.trim().toLowerCase();
  if (currentEmail && excludedEmails.includes(currentEmail)) {
    return true;
  }

  return false;
}

export function setTrackingDisabled(disabled: boolean): void {
  safeStorage.set(TRACKING_DISABLED_KEY, disabled ? 'true' : 'false');
}

export function setServerTrackingExcluded(excluded: boolean): void {
  safeStorage.set(SERVER_TRACKING_EXCLUDED_KEY, excluded ? 'true' : 'false');
}

export function identifyUser(_userId: string, _traits?: Record<string, any>): void {
  // No-op: third-party identity tracking removed
}

export function resetUser(): void {
  // No-op: third-party identity tracking removed
}

export function trackEvent<T extends EventName>(name: T, data?: EventDataMap[T]): void {
  if (isTrackingBlocked()) {
    return;
  }

  const payload = (data || {}) as Record<string, any>;

  try {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/api/events', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ event: name, data: payload }),
        keepalive: true,
      }).catch((err) => {
        logAnalyticsError(`Failed to send event "${name}" to /api/events`, err);
      });
    }
  } catch (err) {
    logAnalyticsError(`Failed to dispatch event "${name}"`, err);
  }

  if (isDevMode()) {
    console.log(`[Analytics] Event: "${name}"`, payload);
  }
}
