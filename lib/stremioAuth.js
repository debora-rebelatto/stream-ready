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
 * Obtém todos os itens da biblioteca oficial do usuário no Stremio
 */
async function getStremioLibrary(authKey) {
  try {
    const res = await fetch(`${STREMIO_API}/datastoreGet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authKey, collection: 'libraryItem', all: true })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || 'Erro ao carregar biblioteca');
    }

    const items = data.result || [];
    // Filtrar apenas itens válidos com ID IMDb (tt...) e que não foram removidos
    const parsed = items
      .filter(item => item && item._id && /^tt\d+/i.test(item._id) && !item.removed)
      .map(item => ({
        id: item._id,
        name: item.name || item.title || item._id,
        type: item.type || 'movie',
        poster: item.poster || '',
        year: item.year || item.releaseInfo || '',
        state: item.state || {}
      }));

    return { success: true, items: parsed };
  } catch (err) {
    console.error('[StremioAuth] Erro na biblioteca:', err.message);
    return { success: false, error: err.message, items: [] };
  }
}

/**
 * Instala o addon diretamente na conta do Stremio do usuário via API
 */
async function installAddonToAccount(authKey, manifestUrl) {
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

    // 2. Buscar o manifest atual do addon
    const manifestRes = await fetch(manifestUrl);
    if (!manifestRes.ok) {
      throw new Error(`Não foi possível acessar o manifesto em ${manifestUrl}`);
    }
    const manifestData = await manifestRes.json();

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
 * Adiciona um filme diretamente na biblioteca oficial do usuário no Stremio
 */
async function addToStremioLibrary(authKey, item) {
  if (!authKey || !item || !item.id) return false;
  try {
    const change = {
      _id: item.id,
      name: item.name,
      type: item.type || 'movie',
      poster: item.poster || '',
      year: item.year || '',
      temp: false,
      _mtime: new Date().toISOString(),
      state: {
        lastWatched: null,
        timeOffset: 0,
        overallTimeWatched: 0,
        timesWatched: 0,
        flaggedWatched: 0,
        duration: 0,
        video_id: null,
        watched: null,
        lastVid: null
      }
    };
    const res = await fetch(`${STREMIO_API}/datastorePut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authKey,
        collection: 'libraryItem',
        changes: [change]
      })
    });
    const data = await res.json();
    return !data.error;
  } catch (err) {
    console.warn('[StremioAuth] Aviso ao salvar na biblioteca do Stremio:', err.message);
    return false;
  }
}

/**
 * Remove um filme da biblioteca oficial do usuário no Stremio
 */
async function removeFromStremioLibrary(authKey, id) {
  if (!authKey || !id) return false;
  try {
    const res = await fetch(`${STREMIO_API}/datastorePut`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        authKey,
        collection: 'libraryItem',
        changes: [{ _id: id, _deleted: true, removed: true, _mtime: new Date().toISOString() }]
      })
    });
    const data = await res.json();
    return !data.error;
  } catch (err) {
    console.warn('[StremioAuth] Aviso ao remover da biblioteca do Stremio:', err.message);
    return false;
  }
}

module.exports = {
  loginStremio,
  getUserInfo,
  getStremioLibrary,
  installAddonToAccount,
  addToStremioLibrary,
  removeFromStremioLibrary
};

