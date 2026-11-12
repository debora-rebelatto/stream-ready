import type {
  WatchlistItem,
  WatchlistStats,
  StremioUser,
  AppSettings,
  ServerInfo,
  SearchMovieResult
} from '../types';

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
  return {
    'Content-Type': 'application/json',
    ...(key ? { 'x-stremio-auth': key } : {}),
  };
}

export const api = {
  async getAuthStatus(): Promise<{ loggedIn: boolean; user?: StremioUser }> {
    const key = getAuthKey();
    if (!key) return { loggedIn: false };

    const res = await fetch('/api/auth/me', {
      headers: { 'x-stremio-auth': key },
    });
    if (!res.ok) return { loggedIn: false };
    return res.json();
  },

  async login(creds: { email?: string; password?: string; authKey?: string }): Promise<{
    success: boolean;
    authKey: string;
    user: StremioUser;
    error?: string;
  }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    return res.json();
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch {
      // ignore
    }
    clearAuth();
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

  async addItem(id: string, type: string = 'movie'): Promise<{
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

  async saveSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> {
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

  async importBackup(items: WatchlistItem[]): Promise<{ success: boolean; addedCount: number; stats: WatchlistStats }> {
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    return res.json();
  },
};
