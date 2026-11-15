import { encodeUserData, decodeUserData } from './userDataService.ts';
import type { StremioUser, StremioLoginResult, StremioWatchedMovie } from '../types';

const STREMIO_API = 'https://api.strem.io/api';

/**
 * Autentica usuário com e-mail e senha no Stremio
 */
export async function loginStremio(email: string, password: string): Promise<StremioLoginResult> {
  try {
    const res = await fetch(`${STREMIO_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });

    const data: any = await res.json();
    if (data.error) {
      const msg = data.error.message || 'Failed to authenticate with Stremio';
      return { success: false, error: msg };
    }

    if (!data.result || !data.result.authKey) {
      return { success: false, error: 'Invalid login response from Stremio' };
    }

    return {
      success: true,
      authKey: data.result.authKey,
      user: {
        id: data.result.user?._id,
        email: data.result.user?.email || email.trim()
      }
    };
  } catch (err: any) {
    console.error('[StremioAuth] Erro no login:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Valida um authKey e obtém dados do usuário
 */
export async function getUserInfo(authKey: string): Promise<StremioUser | null> {
  try {
    const res = await fetch(`${STREMIO_API}/getUser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });

    const data: any = await res.json();
    if (data.error || !data.result) {
      return null;
    }

    return {
      id: data.result._id,
      email: data.result.email
    };
  } catch (err: any) {
    console.error('[StremioAuth] Erro ao validar authKey:', err.message);
    return null;
  }
}

/**
 * Instala o addon diretamente na conta do Stremio do usuário via API
 */
export async function installAddonToAccount(
  authKey: string,
  manifestUrl: string,
  passedManifest: any = null
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // 1. Obter addons instalados atualmente
    const getRes = await fetch(`${STREMIO_API}/addonCollectionGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });

    const getData: any = await getRes.json();
    if (getData.error) {
      throw new Error(getData.error.message || 'Error retrieving account addons');
    }

    let addons = (getData.result && getData.result.addons) || [];

    // 2. Fetch current addon manifest (or use passed in-memory manifest)
    let manifestData = passedManifest;
    if (!manifestData) {
      const manifestRes = await fetch(manifestUrl);
      if (!manifestRes.ok) {
        throw new Error(`Could not access manifest at ${manifestUrl}`);
      }
      manifestData = await manifestRes.json();
    }

    // 3. Check if already in list
    const existingIndex = addons.findIndex(
      (a: any) => a.transportUrl === manifestUrl || a.manifest?.id === manifestData.id
    );
    const addonEntry = {
      transportUrl: manifestUrl,
      manifest: manifestData,
      flags: { official: false, protected: false }
    };

    if (existingIndex >= 0) {
      addons[existingIndex] = addonEntry;
    } else {
      addons.push(addonEntry);
    }

    // 4. Save updated addon list to Stremio account
    const setRes = await fetch(`${STREMIO_API}/addonCollectionSet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, addons })
    });

    const setData: any = await setRes.json();
    if (setData.error) {
      throw new Error(setData.error.message || 'Failed to save addon to account');
    }

    return { success: true, message: 'Addon installed to your Stremio account successfully!' };
  } catch (err: any) {
    console.error('[StremioAuth] Erro ao instalar addon na conta:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Recupera os filmes da watchlist salvos na nuvem do Stremio
 */
export async function getAccountWatchlist(authKey: string): Promise<any[] | null> {
  if (!authKey) return null;
  try {
    const res = await fetch(`${STREMIO_API}/addonCollectionGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });
    const data: any = await res.json();
    if (data.error || !data.result || !Array.isArray(data.result.addons)) {
      return null;
    }
    const addon = data.result.addons.find((a: any) => 
      a.manifest?.id === 'community.watchlist.quality.tracker' ||
      (a.transportUrl && (a.transportUrl.includes('onrender.com') || a.transportUrl.includes('localhost') || a.transportUrl.includes('watchlist')))
    );
    if (!addon) return null;

    // 1. Tentar ler do manifest.watchlistItems
    if (Array.isArray(addon.manifest?.watchlistItems) && addon.manifest.watchlistItems.length > 0) {
      return addon.manifest.watchlistItems;
    }

    // 2. Tentar decodificar da transportUrl
    if (addon.transportUrl) {
      const parts = addon.transportUrl.split('/');
      const manifestIndex = parts.indexOf('manifest.json');
      if (manifestIndex > 0) {
        const encodedParam = parts[manifestIndex - 1];
        const decoded = decodeUserData(encodedParam);
        if (decoded.items && decoded.items.length > 0) {
          return decoded.items;
        }
        if (decoded.ids && decoded.ids.length > 0) {
          return decoded.ids.map(id => ({ id, name: id, has1080pPlus: false, bestQuality: 'Pending', type: 'movie' }));
        }
      }
    }
    return [];
  } catch (err: any) {
    console.warn('[StremioAuth] Erro ao recuperar watchlist da conta:', err.message);
    return null;
  }
}

/**
 * Salva a lista de filmes na nuvem do Stremio (manifest + transportUrl)
 */
export async function saveAccountWatchlist(
  authKey: string,
  baseUrl: string,
  items: any[],
  baseManifest: any
): Promise<boolean> {
  if (!authKey) return false;
  try {
    const encoded = encodeUserData(authKey, items);
    const manifestUrl = `${baseUrl}/${encoded}/manifest.json`;

    const getRes = await fetch(`${STREMIO_API}/addonCollectionGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });
    const getData: any = await getRes.json();
    if (getData.error) {
      throw new Error(getData.error.message || 'Erro ao obter addons da conta');
    }

    let addons = (getData.result && getData.result.addons) || [];

    const addonEntry = {
      transportUrl: manifestUrl,
      manifest: {
        ...baseManifest,
        watchlistItems: items
      },
      flags: { official: false, protected: false }
    };

    const existingIndex = addons.findIndex((a: any) => 
      a.manifest?.id === 'community.watchlist.quality.tracker' ||
      (a.transportUrl && (a.transportUrl.includes('onrender.com') || a.transportUrl.includes('localhost') || a.transportUrl.includes('watchlist')))
    );

    if (existingIndex >= 0) {
      addons[existingIndex] = addonEntry;
    } else {
      addons.push(addonEntry);
    }

    const setRes = await fetch(`${STREMIO_API}/addonCollectionSet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, addons })
    });

    const setData: any = await setRes.json();
    if (setData.error) {
      throw new Error(setData.error.message || 'Falha ao salvar addon na conta');
    }

    console.log(`[StremioAuth] Watchlist com ${items.length} filmes salva na nuvem do Stremio com sucesso!`);
    return true;
  } catch (err: any) {
    console.warn('[StremioAuth] Erro ao salvar watchlist na nuvem:', err.message);
    return false;
  }
}

/**
 * Recupera os filmes assistidos da biblioteca oficial do usuário no Stremio
 */
export async function getStremioWatchedMovies(authKey: string): Promise<StremioWatchedMovie[]> {
  if (!authKey) return [];
  try {
    const res = await fetch(`${STREMIO_API}/datastoreGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, collection: 'libraryItem', all: true })
    });
    const data: any = await res.json();
    if (!data || !Array.isArray(data.result)) {
      return [];
    }

    const watchedList: StremioWatchedMovie[] = [];
    for (const it of data.result) {
      // Aceita filmes (ou itens sem tipo explícito mas com id IMDb)
      const isMovie = (it.type === 'movie' || (!it.type && /^tt\d+/.test(it._id)));
      if (!isMovie) continue;

      const s = it.state || {};
      const ratio = s.duration > 0 ? (s.timeOffset / s.duration) : 0;
      const isWatched = s.flaggedWatched === 1 || s.timesWatched > 0 || ratio > 0.8;

      if (isWatched) {
        watchedList.push({
          id: it._id,
          name: it.name || it._id,
          year: it.year ? String(it.year) : '',
          poster: it.poster || '',
          type: 'movie',
          isWatched: true,
          watchedAt: s.lastWatched || new Date().toISOString(),
          addedAt: it._ctime || new Date().toISOString(),
          has1080pPlus: true,
          bestQuality: 'Watched',
          streamCount: 1
        });
      }
    }

    return watchedList;
  } catch (err: any) {
    console.warn('[StremioAuth] Erro ao buscar biblioteca assistida:', err.message);
    return [];
  }
}

export const stremioAuthService = {
  loginStremio,
  getUserInfo,
  installAddonToAccount,
  getAccountWatchlist,
  saveAccountWatchlist,
  getStremioWatchedMovies
};

export default stremioAuthService;