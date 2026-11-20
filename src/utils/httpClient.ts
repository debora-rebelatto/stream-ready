import type {
  WatchlistItem,
  WatchlistStats,
  StremioUser,
  AppSettings,
  ServerInfo,
  SearchMovieResult,
  CustomList,
  CuratedList,
  TopMovieMetric,
} from '../models';
import { safeStorage } from './safeStorage';

export function getAuthKey(): string | null {
  return localStorage.getItem('stremioAuthKey');
}

export function setAuthKey(key: string, email?: string): void {
  localStorage.setItem('stremioAuthKey', key);
  if (email) {
    localStorage.setItem('stremioEmail', email);
  }
}

export function clearAuth(): void {
  localStorage.removeItem('stremioAuthKey');
  localStorage.removeItem('stremioEmail');
}

export function getAuthHeaders(): HeadersInit {
  const key = getAuthKey();
  let isOptOut = safeStorage.get('stremio_tracking_disabled') === 'true';
  const email = safeStorage.get('stremioEmail')?.toLowerCase().trim();
  const excluded = safeStorage.get('stremio_excluded_tracking_emails');
  if (email && excluded && excluded.toLowerCase().includes(email)) {
    isOptOut = true;
  }

  return {
    'Content-Type': 'application/json',
    ...(key ? { 'x-stremio-auth': key } : {}),
    ...(isOptOut ? { 'x-opt-out-tracking': 'true' } : {}),
  };
}

export async function safeJsonParse<T = any>(
  res: Response | any,
  fallbackErrorMessage: string = 'Server response was invalid or empty'
): Promise<T> {
  if (typeof res.text !== 'function' && typeof res.json === 'function') {
    return res.json();
  }
  const text = typeof res.text === 'function' ? await res.text() : '';
  if (!text || !text.trim()) {
    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}. Please check backend connection.`);
    }
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.length < 120 ? text : fallbackErrorMessage);
  }
}

export const api = {
  async getAuthStatus(): Promise<{
    loggedIn: boolean;
    user?: StremioUser;
    isUnauthorized?: boolean;
  }> {
    const key = getAuthKey();
    if (!key) return { loggedIn: false, isUnauthorized: true };

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-stremio-auth': key },
      });
      if (res.status === 401) {
        return { loggedIn: false, isUnauthorized: true };
      }
      if (!res.ok) {
        return { loggedIn: false, isUnauthorized: false };
      }
      const data = await safeJsonParse(res, 'Invalid auth status response');
      return { ...data, isUnauthorized: false };
    } catch (err) {
      console.warn('Network error checking auth status:', err);
      return { loggedIn: false, isUnauthorized: false };
    }
  },

  async login(creds: { email?: string; password?: string; authKey?: string }): Promise<{
    success: boolean;
    authKey: string;
    user: StremioUser;
    error?: string;
  }> {
    const transientStatuses = new Set([502, 503, 504]);

    const sendLoginRequest = () =>
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });

    try {
      let res = await sendLoginRequest();
      if (transientStatuses.has(res.status)) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await new Promise<void>((resolve) => {
            timer = setTimeout(resolve, 400);
          });
        } finally {
          if (timer) clearTimeout(timer);
        }
        res = await sendLoginRequest();
      }

      const data = await safeJsonParse(res, 'Login failed: Invalid server response');
      if (!res.ok) {
        return {
          success: false,
          authKey: '',
          user: { email: '' },
          error: data?.error || `Server error (${res.status}): Please check that the server is running.`,
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        authKey: '',
        user: { email: '' },
        error: err.message || 'Cannot connect to server. Please verify the server is running.',
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch (err) {
      console.warn('[Auth] Logout request failed:', err);
    }
    clearAuth();
  },

  async deleteAccount(): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async installToAccount(): Promise<{ success: boolean; message?: string; error?: string }> {
    const res = await fetch('/api/auth/install-account', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async getItems(filter?: 'ready' | 'pending'): Promise<{
    items: WatchlistItem[];
    stats: WatchlistStats;
    requireAuth: boolean;
  }> {
    const q = filter ? `?filter=${filter}` : '';
    const res = await fetch(`/api/items${q}`, {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async searchMovies(query: string): Promise<SearchMovieResult[]> {
    if (!query.trim()) return [];
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async getTopMovies(limit: number = 3): Promise<TopMovieMetric[]> {
    try {
      const res = await fetch(`/api/top-movies?limit=${limit}`, {
        headers: getAuthHeaders(),
      });
      const data = await safeJsonParse(res, 'Failed to fetch top movies');
      return Array.isArray(data?.movies) ? data.movies : [];
    } catch (err) {
      console.warn('Failed to fetch top movies:', err);
      return [];
    }
  },

  async addItem(
    id: string,
    type: string = 'movie'
  ): Promise<{
    success: boolean;
    item: WatchlistItem;
    error?: string;
    message?: string;
  }> {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, type }),
    });
    return res.json();
  },

  async deleteItem(id: string): Promise<{ success: boolean; stats: WatchlistStats }> {
    const res = await fetch(`/api/items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async setWatched(
    id: string,
    watched: boolean
  ): Promise<{ success: boolean; item: WatchlistItem; stats: WatchlistStats }> {
    const res = await fetch(`/api/items/${id}/watched`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ watched }),
    });
    return res.json();
  },

  async syncWatchedFromStremio(): Promise<{
    success: boolean;
    result: { count: number; newlyMarked: number; newlyAdded: number; totalWatched: number };
    items: WatchlistItem[];
    stats: WatchlistStats;
  }> {
    const res = await fetch('/api/items/sync-watched', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async recheckSingle(id: string): Promise<{
    success: boolean;
    item: WatchlistItem;
    becameReady: boolean;
  }> {
    const res = await fetch(`/api/check/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async recheckAll(forceAll = false): Promise<{
    success: boolean;
    checkedCount: number;
    newlyReady: number;
    stats: WatchlistStats;
  }> {
    const res = await fetch('/api/check-all', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ forceAll }),
    });
    return res.json();
  },

  async getSettings(): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async saveSettings(
    settings: Partial<AppSettings>
  ): Promise<{ success: boolean; settings: AppSettings }> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async getInfo(): Promise<ServerInfo> {
    const res = await fetch('/api/info', {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async exportBackup(): Promise<WatchlistItem[]> {
    const res = await fetch('/api/export', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to export backup (${res.status})`);
    }
    return res.json();
  },

  async importBackup(
    items: WatchlistItem[]
  ): Promise<{ success: boolean; addedCount: number; stats: WatchlistStats }> {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    return res.json();
  },

  async getCustomLists(): Promise<{ success: boolean; lists: CustomList[] }> {
    const res = await fetch('/api/lists', {
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async createCustomList(
    name: string,
    emoji = ''
  ): Promise<{ success: boolean; list: CustomList; error?: string }> {
    const res = await fetch('/api/lists', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, emoji }),
    });
    return res.json();
  },

  async updateCustomList(
    id: string,
    name: string,
    emoji?: string
  ): Promise<{ success: boolean; list: CustomList; error?: string }> {
    const res = await fetch(`/api/lists/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, emoji }),
    });
    return res.json();
  },

  async deleteCustomList(id: string): Promise<{
    success: boolean;
    deletedItemsCount?: number;
    deletedItemIds?: string[];
    error?: string;
  }> {
    const res = await fetch(`/api/lists/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.json();
  },

  async setItemCustomLists(
    id: string,
    listIds: string[]
  ): Promise<{ success: boolean; item: WatchlistItem; error?: string }> {
    const res = await fetch(`/api/items/${id}/lists`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ listIds }),
    });
    return res.json();
  },

  async getCuratedLists(): Promise<{ success: boolean; lists: CuratedList[]; error?: string }> {
    try {
      const res = await fetch('/api/curated-lists', {
        headers: getAuthHeaders(),
      });
      const text = await res.text();
      return text ? JSON.parse(text) : { success: false, lists: [] };
    } catch {
      return { success: false, lists: [] };
    }
  },

  async addCuratedList(id: string): Promise<{
    success: boolean;
    list?: CustomList;
    addedMoviesCount?: number;
    existingMoviesCount?: number;
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/curated-lists/${encodeURIComponent(id)}/add`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        return {
          success: false,
          error: `Server returned an invalid response (${res.status}). Please check server logs.`,
        };
      }
      if (!res.ok) {
        return {
          success: false,
          error: data.error || `Server returned ${res.status}. Please check server connection.`,
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message?.includes('JSON')
          ? 'Cannot connect to backend server. Please verify the server is running on port 7000.'
          : err.message || 'Error connecting to server.',
      };
    }
  },

  async submitPollVote(
    option: string,
    customText?: string
  ): Promise<{ success: boolean; vote?: any; error?: string }> {
    try {
      const res = await fetch('/api/poll/vote', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ option, customText }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Error submitting vote' };
    }
  },

  async getPollStatus(): Promise<{ hasVoted: boolean; vote?: any }> {
    try {
      const res = await fetch('/api/poll/status', {
        headers: getAuthHeaders(),
      });
      return await res.json();
    } catch {
      return { hasVoted: false };
    }
  },
};
