const { encodeUserData, decodeUserData } = require('./userData');

const STREMIO_API = 'https://api.strem.io/api';

/**
 * Autentica usuário com e-mail e senha no Stremio
 */
async function loginStremio(email, password) {
  try {
    const res = await fetch(`${STREMIO_API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });

    const data = await res.json();
    if (data.error) {
      const msg = data.error.message || 'Falha ao autenticar com o Stremio';
      return { success: false, error: msg };
    }

    if (!data.result || !data.result.authKey) {
      return { success: false, error: 'Resposta de login inválida do Stremio' };
    }

    return {
      success: true,
      authKey: data.result.authKey,
      user: {
        id: data.result.user?._id,
        email: data.result.user?.email || email.trim()
      }
    };
  } catch (err) {
    console.error('[StremioAuth] Erro no login:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Valida um authKey e obtém dados do usuário
 */
async function getUserInfo(authKey) {
  try {
    const res = await fetch(`${STREMIO_API}/getUser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });

    const data = await res.json();
    if (data.error || !data.result) {
      return null;
    }

    return {
      id: data.result._id,
      email: data.result.email
    };
  } catch (err) {
    console.error('[StremioAuth] Erro ao validar authKey:', err.message);
    return null;
  }
}

/**
 * Instala o addon diretamente na conta do Stremio do usuário via API
 */
async function installAddonToAccount(authKey, manifestUrl, passedManifest = null) {
  try {
    // 1. Obter addons instalados atualmente
    const getRes = await fetch(`${STREMIO_API}/addonCollectionGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });

    const getData = await getRes.json();
    if (getData.error) {
      throw new Error(getData.error.message || 'Erro ao obter addons da conta');
    }

    let addons = (getData.result && getData.result.addons) || [];

    // 2. Buscar o manifest atual do addon (ou usar o fornecido em memória)
    let manifestData = passedManifest;
    if (!manifestData) {
      const manifestRes = await fetch(manifestUrl);
      if (!manifestRes.ok) {
        throw new Error(`Não foi possível acessar o manifesto em ${manifestUrl}`);
      }
      manifestData = await manifestRes.json();
    }

    // 3. Verificar se já está na lista
    const existingIndex = addons.findIndex(a => a.transportUrl === manifestUrl || a.manifest?.id === manifestData.id);
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

    // 4. Salvar nova lista de addons na conta do Stremio
    const setRes = await fetch(`${STREMIO_API}/addonCollectionSet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, addons })
    });

    const setData = await setRes.json();
    if (setData.error) {
      throw new Error(setData.error.message || 'Falha ao salvar addon na conta');
    }

    return { success: true, message: 'Addon instalado com sucesso na sua conta do Stremio!' };
  } catch (err) {
    console.error('[StremioAuth] Erro ao instalar addon na conta:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Recupera os filmes da watchlist salvos na nuvem do Stremio
 */
async function getAccountWatchlist(authKey) {
  if (!authKey) return null;
  try {
    const res = await fetch(`${STREMIO_API}/addonCollectionGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });
    const data = await res.json();
    if (data.error || !data.result || !Array.isArray(data.result.addons)) {
      return null;
    }
    const addon = data.result.addons.find(a => 
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
          return decoded.ids.map(id => ({ id, name: id, has1080pPlus: false, bestQuality: 'Pendente', type: 'movie' }));
        }
      }
    }
    return [];
  } catch (err) {
    console.warn('[StremioAuth] Erro ao recuperar watchlist da conta:', err.message);
    return null;
  }
}

/**
 * Salva a lista de filmes na nuvem do Stremio (manifest + transportUrl)
 */
async function saveAccountWatchlist(authKey, baseUrl, items, baseManifest) {
  if (!authKey) return false;
  try {
    const encoded = encodeUserData(authKey, items);
    const manifestUrl = `${baseUrl}/${encoded}/manifest.json`;

    const getRes = await fetch(`${STREMIO_API}/addonCollectionGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey })
    });
    const getData = await getRes.json();
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

    const existingIndex = addons.findIndex(a => 
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

    const setData = await setRes.json();
    if (setData.error) {
      throw new Error(setData.error.message || 'Falha ao salvar addon na conta');
    }

    console.log(`[StremioAuth] Watchlist com ${items.length} filmes salva na nuvem do Stremio com sucesso!`);
    return true;
  } catch (err) {
    console.warn('[StremioAuth] Erro ao salvar watchlist na nuvem:', err.message);
    return false;
  }
}

module.exports = {
  loginStremio,
  getUserInfo,
  installAddonToAccount,
  getAccountWatchlist,
  saveAccountWatchlist
};

