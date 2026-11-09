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

module.exports = {
  loginStremio,
  getUserInfo,
  installAddonToAccount
};

