// State
let currentTab = 'all';
let allItems = [];
let searchTimeout = null;
let currentUser = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const btnClearSearch = document.getElementById('btnClearSearch');
const watchlistContainer = document.getElementById('watchlistContainer');
const tabButtons = document.querySelectorAll('.tab-btn');

const statTotal = document.getElementById('statTotal');
const statReady = document.getElementById('statReady');
const statPending = document.getElementById('statPending');

const tabCountAll = document.getElementById('tabCountAll');
const tabCountReady = document.getElementById('tabCountReady');
const tabCountPending = document.getElementById('tabCountPending');

const btnInstallStremio = document.getElementById('btnInstallStremio');
const btnCopyLink = document.getElementById('btnCopyLink');
const btnSettings = document.getElementById('btnSettings');
const btnCloseModal = document.getElementById('btnCloseModal');
const settingsModal = document.getElementById('settingsModal');
const btnCheckAllPending = document.getElementById('btnCheckAllPending');

// Auth DOM Elements
const btnOpenLogin = document.getElementById('btnOpenLogin');
const userLoggedInMenu = document.getElementById('userLoggedInMenu');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const btnLogout = document.getElementById('btnLogout');
const accountSyncCard = document.getElementById('accountSyncCard');
const syncUserEmail = document.getElementById('syncUserEmail');
const btnInstallAccountDirect = document.getElementById('btnInstallAccountDirect');

const loginModal = document.getElementById('loginModal');
const btnCloseLoginModal = document.getElementById('btnCloseLoginModal');
const loginTabButtons = document.querySelectorAll('.login-tab-btn');
const formLoginCredentials = document.getElementById('formLoginCredentials');
const formLoginAuthKey = document.getElementById('formLoginAuthKey');

const toastContainer = document.getElementById('toastContainer');

// Init
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  setupAuthEventListeners();
  setupAddonLinks();
  await checkAuthStatus();
});

// -------------------------------------------------------------
// STREMIO AUTHENTICATION & LIBRARY SYNC
// -------------------------------------------------------------

function getAuthHeaders() {
  const key = localStorage.getItem('stremioAuthKey');
  return key ? { 'x-stremio-auth': key, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function checkAuthStatus() {
  const key = localStorage.getItem('stremioAuthKey');
  if (!key) {
    setAuthUI(false, null);
    return;
  }

  // Carrega do cache local imediatamente para exibição instantânea (apenas se tiver chave de login)
  const cached = localStorage.getItem('watchlist_cached_items');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allItems = parsed;
        const total = allItems.length;
        const ready = allItems.filter(i => i.has1080pPlus).length;
        const pending = total - ready;
        updateStats({ total, ready, pending });
        renderItems();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'x-stremio-auth': key }
    });
    const data = await res.json();
    if (data.loggedIn && data.user) {
      if (data.user.email) localStorage.setItem('stremioEmail', data.user.email);
      setAuthUI(true, data.user);
      await loadWatchlist();
    } else if (res.status === 401 || (data && data.loggedIn === false)) {
      localStorage.removeItem('stremioAuthKey');
      localStorage.removeItem('stremioEmail');
      localStorage.removeItem('watchlist_cached_items');
      setAuthUI(false, null);
    }
  } catch (err) {
    console.warn('Servidor pode estar acordando:', err);
    const cachedEmail = localStorage.getItem('stremioEmail') || 'Conectado';
    setAuthUI(true, { email: cachedEmail });
    setTimeout(checkAuthStatus, 6000);
  }
}

function setAuthUI(isLoggedIn, user) {
  currentUser = isLoggedIn ? user : null;
  const searchSection = document.querySelector('.search-section');
  const listControls = document.querySelector('.list-controls');

  if (isLoggedIn && user) {
    btnOpenLogin.classList.add('hidden');
    userLoggedInMenu.classList.remove('hidden');
    userEmailDisplay.textContent = user.email || 'Conectado';
    accountSyncCard.classList.remove('hidden');
    syncUserEmail.textContent = user.email;
    if (searchSection) searchSection.classList.remove('hidden');
    if (listControls) listControls.classList.remove('hidden');
  } else {
    btnOpenLogin.classList.remove('hidden');
    userLoggedInMenu.classList.add('hidden');
    accountSyncCard.classList.add('hidden');
    if (searchSection) searchSection.classList.add('hidden');
    if (listControls) listControls.classList.add('hidden');
    currentUser = null;
    allItems = [];
    updateStats({ total: 0, ready: 0, pending: 0 });
    renderItems();
  }
}

function setupAuthEventListeners() {
  // Open / Close Login Modal
  btnOpenLogin.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
  });

  btnCloseLoginModal.addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });

  loginModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });

  // Switch Login Tabs (Creds vs AuthKey)
  loginTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      loginTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.loginType;
      if (type === 'credentials') {
        formLoginCredentials.classList.remove('hidden');
        formLoginAuthKey.classList.add('hidden');
      } else {
        formLoginCredentials.classList.add('hidden');
        formLoginAuthKey.classList.remove('hidden');
      }
    });
  });

  // Submit Credentials Login
  formLoginCredentials.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('btnSubmitLoginCreds');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Autenticando com Stremio...';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar com Stremio';

      if (!res.ok || !data.success) {
        showToast(data.error || 'Falha ao autenticar.', 'error');
        return;
      }

      showToast(`🎉 Bem-vindo(a), ${data.user.email}!`, 'success');
      localStorage.setItem('stremioAuthKey', data.authKey);
      if (data.user?.email) localStorage.setItem('stremioEmail', data.user.email);
      loginModal.classList.add('hidden');
      setAuthUI(true, data.user);
      setupAddonLinks();
      await loadWatchlist();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar com Stremio';
      showToast('Erro ao conectar com os servidores do Stremio.', 'error');
    }
  });

  // Submit AuthKey Login
  formLoginAuthKey.addEventListener('submit', async (e) => {
    e.preventDefault();
    const authKey = document.getElementById('loginAuthKey').value.trim();
    const submitBtn = document.getElementById('btnSubmitLoginKey');

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Validando AuthKey...';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey })
      });

      const data = await res.json();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Validar AuthKey';

      if (!res.ok || !data.success) {
        showToast(data.error || 'AuthKey inválida.', 'error');
        return;
      }

      showToast(`🎉 Conectado com sucesso como ${data.user.email}!`, 'success');
      localStorage.setItem('stremioAuthKey', data.authKey);
      if (data.user?.email) localStorage.setItem('stremioEmail', data.user.email);
      loginModal.classList.add('hidden');
      setAuthUI(true, data.user);
      setupAddonLinks();
      await loadWatchlist();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Validar AuthKey';
      showToast('Erro ao validar chave.', 'error');
    }
  });

  // Logout
  btnLogout.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() });
    } catch (err) {}
    localStorage.removeItem('stremioAuthKey');
    localStorage.removeItem('stremioEmail');
    localStorage.removeItem('watchlist_cached_items');
    setAuthUI(false, null);
    setupAddonLinks();
    showToast('Desconectado com sucesso.', 'info');
  });

  // Direct 1-Click Install to Account
  btnInstallAccountDirect.addEventListener('click', async () => {
    try {
      btnInstallAccountDirect.disabled = true;
      btnInstallAccountDirect.textContent = 'Ativando na conta...';
      showToast('Instalando addon diretamente na sua conta do Stremio...', 'info');

      const res = await fetch('/api/auth/install-account', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      btnInstallAccountDirect.disabled = false;
      btnInstallAccountDirect.textContent = '✨ Ativar na Conta (1-Click)';

      if (!res.ok || data.error) {
        showToast(data.error || 'Erro ao instalar na conta.', 'error');
        return;
      }

      showToast('🎉 Sucesso! O addon foi instalado na sua conta e já está disponível na sua Smart TV e em todos os seus aparelhos!', 'success');
    } catch (err) {
      btnInstallAccountDirect.disabled = false;
      btnInstallAccountDirect.textContent = '✨ Ativar na Conta (1-Click)';
      showToast('Falha ao ativar na conta.', 'error');
    }
  });
}

// Setup Stremio Install & Copy Links
async function setupAddonLinks() {
  try {
    const res = await fetch('/api/info', {
      headers: getAuthHeaders()
    });
    const info = await res.json();
    
    // Links based on Cloud (Render) vs Local
    const manifestUrl = info.manifestUrl;
    const installUrl = info.stremioInstallUrl || `stremio://${window.location.host}/manifest.json`;

    // Top button: redirect directly to Stremio app
    btnInstallStremio.href = installUrl;
    btnInstallStremio.onclick = (e) => {
      e.preventDefault();
      window.location.href = installUrl;
    };

    btnCopyLink.onclick = () => {
      navigator.clipboard.writeText(manifestUrl).then(() => {
        showToast('Link do manifesto copiado! Cole na busca de Addons do Stremio.', 'success');
      }).catch(() => {
        prompt('Copie o link do Addon abaixo:', manifestUrl);
      });
    };
  } catch (err) {
    console.error('Erro ao obter info do servidor:', err);
    const fallbackUrl = `stremio://${window.location.host}/manifest.json`;
    const fallbackManifestUrl = `${window.location.origin}/manifest.json`;
    btnInstallStremio.href = fallbackUrl;
    btnCopyLink.onclick = () => {
      navigator.clipboard.writeText(fallbackManifestUrl).then(() => {
        showToast('Link do manifesto copiado! Cole na busca de Addons do Stremio.', 'success');
      }).catch(() => {
        prompt('Copie o link do Addon abaixo:', fallbackManifestUrl);
      });
    };
  }
}

// Event Listeners
function setupEventListeners() {
  // Mobile Navigation Toggle
  const btnMobileNavToggle = document.getElementById('btnMobileNavToggle');
  const navActions = document.getElementById('navActions');
  if (btnMobileNavToggle && navActions) {
    btnMobileNavToggle.addEventListener('click', () => {
      btnMobileNavToggle.classList.toggle('active');
      navActions.classList.toggle('open');
    });

    // Close mobile menu when an action button is clicked
    navActions.querySelectorAll('.btn, .btn-logout-link').forEach(btn => {
      btn.addEventListener('click', () => {
        btnMobileNavToggle.classList.remove('active');
        navActions.classList.remove('open');
      });
    });
  }

  // Search input live debouncing
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
      btnClearSearch.classList.remove('hidden');
    } else {
      btnClearSearch.classList.add('hidden');
      searchResults.classList.add('hidden');
      return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => executeSearch(query), 300);
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');
    searchResults.classList.add('hidden');
  });

  // Close search dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box-wrapper')) {
      searchResults.classList.add('hidden');
    }
  });

  // Tab filtering
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderItems();
    });
  });

  // Stat card filter clicks
  document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      const targetBtn = document.querySelector(`.tab-btn[data-tab="${filter}"]`);
      if (targetBtn) targetBtn.click();
    });
  });

  // Check all pending button
  btnCheckAllPending.addEventListener('click', handleCheckAllPending);

  // Settings modal
  btnSettings.addEventListener('click', openSettings);
  const btnHeroSettings = document.getElementById('btnHeroSettings');
  if (btnHeroSettings) {
    btnHeroSettings.addEventListener('click', openSettings);
  }
  btnCloseModal.addEventListener('click', closeSettings);
  settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettings);
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);

  // Backup Import/Export
  document.getElementById('btnExportJson').addEventListener('click', () => {
    window.location.href = '/api/export';
  });

  const importInput = document.getElementById('importFileInput');
  importInput.addEventListener('change', handleImportBackup);

  // Ao clicar em qualquer filme no navegador, redirecionar para o filme dentro do app do Stremio
  watchlistContainer.addEventListener('click', (e) => {
    if (
      e.target.closest('.btn-card-delete') ||
      e.target.closest('.btn-delete-item') ||
      e.target.closest('button')
    ) {
      return;
    }
    const card = e.target.closest('.movie-card');
    if (card && card.dataset.id) {
      const id = card.dataset.id;
      const type = card.dataset.type || 'movie';
      const stremioDeepLink = type === 'series'
        ? `stremio:///detail/series/${id}`
        : `stremio:///detail/movie/${id}/${id}`;
      window.location.href = stremioDeepLink;
    }
  });
}

// Load Watchlist Data
async function loadWatchlist() {
  if (!currentUser) {
    renderItems();
    return;
  }

  // 1. Carregamento instantâneo do cache local para nunca exibir tela vazia
  const cached = localStorage.getItem('watchlist_cached_items');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        allItems = parsed;
        const total = allItems.length;
        const ready = allItems.filter(i => i.has1080pPlus).length;
        const pending = total - ready;
        updateStats({ total, ready, pending });
        renderItems();
      }
    } catch (e) {}
  }

  try {
    const res = await fetch('/api/items', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.requireAuth) {
      setAuthUI(false, null);
      return;
    }

    const serverItems = data.items || [];

    // Se o servidor voltou vazio mas temos itens salvos localmente, reidrata automaticamente!
    if (serverItems.length === 0 && allItems.length > 0) {
      try {
        const syncRes = await fetch('/api/items/sync-batch', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ items: allItems })
        });
        const syncData = await syncRes.json();
        if (syncData.items && syncData.items.length > 0) {
          allItems = syncData.items;
          localStorage.setItem('watchlist_cached_items', JSON.stringify(allItems));
          updateStats(syncData.stats);
          renderItems();
          setupAddonLinks();
          return;
        }
      } catch (syncErr) {
        console.warn('Aviso ao reidratar itens:', syncErr);
      }
      // Se a reidratação ainda está em andamento ou falhou temporariamente, NÃO sobrescreve com array vazio!
      return;
    }

    if (serverItems.length > 0 || allItems.length === 0) {
      allItems = serverItems;
      localStorage.setItem('watchlist_cached_items', JSON.stringify(allItems));
      updateStats(data.stats);
      renderItems();
      setupAddonLinks();
    }
  } catch (err) {
    console.error('Erro ao carregar watchlist:', err);
    showToast('Erro ao carregar itens da watchlist.', 'error');
  }
}

// Update Stats in UI
function updateStats(stats) {
  if (!stats) return;
  statTotal.textContent = stats.total;
  statReady.textContent = stats.ready;
  statPending.textContent = stats.pending;

  tabCountAll.textContent = stats.total;
  tabCountReady.textContent = stats.ready;
  tabCountPending.textContent = stats.pending;
}

// Render Items based on Active Tab
function renderItems() {
  // Se não estiver conectado em uma conta, não renderiza nenhuma lista
  if (!currentUser) {
    watchlistContainer.innerHTML = `
      <div class="empty-state auth-locked-box">
        <div class="empty-icon">🔒</div>
        <h3>Nenhuma lista disponível sem login</h3>
        <p>Conecte sua conta do Stremio para carregar, visualizar e gerenciar seus filmes sem gravações de cinema.</p>
        <button class="btn btn-primary" id="btnLockedLoginAction" style="margin-top: 1.25rem;">
          🔐 Entrar com Stremio
        </button>
      </div>
    `;
    const btnLocked = document.getElementById('btnLockedLoginAction');
    if (btnLocked) {
      btnLocked.addEventListener('click', () => btnOpenLogin.click());
    }
    return;
  }

  let filtered = allItems;
  if (currentTab === 'ready') {
    filtered = allItems.filter(i => i.has1080pPlus);
  } else if (currentTab === 'pending') {
    filtered = allItems.filter(i => !i.has1080pPlus);
  }

  if (filtered.length === 0) {
    let emptyMsg = 'Sua watchlist está vazia.';
    if (currentTab === 'ready') emptyMsg = 'Nenhum filme com versão limpa disponível ainda.';
    if (currentTab === 'pending') emptyMsg = 'Nenhum filme aguardando versão limpa!';

    watchlistContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${currentTab === 'ready' ? '🎬' : '⏳'}</div>
        <h3>${emptyMsg}</h3>
        <p>Use a barra de busca acima para pesquisar ou clique em "Sincronizar Biblioteca" para importar seus filmes.</p>
      </div>
    `;
    return;
  }

  watchlistContainer.innerHTML = filtered.map(item => {
    const ready = item.has1080pPlus;
    const badgeClass = ready ? 'ready' : 'pending';
    const badgeText = ready ? '🟢 PRONTO (NÃO CAM)' : '⏳ APENAS CAM';
    const qualityText = item.bestQuality || 'Pendente';
    const streamsText = item.streamCount > 0 ? `${item.streamCount} fontes` : '0 fontes';
    const itemType = item.type || 'movie';

    return `
      <div class="movie-card" data-id="${item.id}" data-type="${itemType}" title="Clique para abrir no Stremio">
        <div class="poster-wrap">
          <img class="poster-img" src="${item.poster || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231e2235%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%239ca3af%22 text-anchor=%22middle%22>Sem Imagem</text></svg>'}" alt="${item.name}" loading="lazy">
          <div class="poster-badge ${badgeClass}">${badgeText}</div>
          <button class="btn-card-delete btn-delete-item" data-id="${item.id}" title="Remover da watchlist" aria-label="Remover ${item.name} da watchlist">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
            </svg>
          </button>
        </div>
        <div class="card-details">
          <h3 class="card-title" title="${item.name}">${item.name}</h3>
          <div class="card-sub">
            <span>${item.year || ''}</span>
            <span>⭐ ${item.imdbRating || '-'}</span>
          </div>
          <div class="quality-pill ${badgeClass}">
            <span>${qualityText}</span> • <span>${streamsText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  watchlistContainer.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDeleteItem(btn.dataset.id);
    });
  });
}

// Search Cinemeta API
async function executeSearch(query) {
  try {
    searchResults.innerHTML = '<div class="search-item">Buscando filmes...</div>';
    searchResults.classList.remove('hidden');

    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const results = await res.json();

    if (!results || results.length === 0) {
      searchResults.innerHTML = '<div class="search-item" style="color: var(--text-muted)">Nenhum filme encontrado. Tente outro termo ou o ID do IMDb (ex: tt1234567).</div>';
      return;
    }

    searchResults.innerHTML = results.slice(0, 10).map(movie => {
      const isAlreadyAdded = allItems.some(i => i.id === movie.id);
      return `
        <div class="search-item" data-id="${movie.id}">
          <img class="search-poster" src="${movie.poster || ''}" alt="" onerror="this.style.display='none'">
          <div class="search-info">
            <div class="search-title">${movie.name}</div>
            <div class="search-meta">${movie.year || ''} • IMDb: ${movie.id}</div>
          </div>
          <button class="btn-add-search" data-id="${movie.id}" ${isAlreadyAdded ? 'disabled style="opacity:0.5"' : ''}>
            ${isAlreadyAdded ? '✓ Na Watchlist' : '+ Adicionar'}
          </button>
        </div>
      `;
    }).join('');

    searchResults.querySelectorAll('.btn-add-search').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleAddMovie(btn.dataset.id);
      });
    });

  } catch (err) {
    console.error('Erro na busca:', err);
    searchResults.innerHTML = '<div class="search-item" style="color: #ef4444">Erro ao buscar resultados.</div>';
  }
}

// Add Movie to Watchlist
async function handleAddMovie(id) {
  try {
    showToast(`Adicionando filme e verificando qualidade 1080p+...`, 'info');
    searchResults.classList.add('hidden');
    searchInput.value = '';
    btnClearSearch.classList.add('hidden');

    const res = await fetch('/api/items', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id, type: 'movie' })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      showToast(data.error || 'Erro ao adicionar filme.', 'error');
      return;
    }

    const item = data.item;
    allItems = allItems.filter(i => i.id !== item.id);
    allItems.unshift(item);
    localStorage.setItem('watchlist_cached_items', JSON.stringify(allItems));

    if (item.has1080pPlus) {
      showToast(`🎉 "${item.name}" adicionado! Já está PRONTO em ${item.bestQuality} (Não é CAM)!`, 'success');
    } else {
      showToast(`⏳ "${item.name}" adicionado! Aguardando versão limpa (atualmente: ${item.bestQuality}).`, 'info');
    }

    await loadWatchlist();
  } catch (err) {
    console.error('Erro ao adicionar:', err);
    showToast('Erro ao comunicar com o servidor.', 'error');
  }
}

// Recheck Single Item Quality
async function handleCheckSingle(id, btnElement) {
  try {
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '⏳ Checando...';
    btnElement.disabled = true;

    const res = await fetch(`/api/check/${id}`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json();

    btnElement.innerHTML = originalText;
    btnElement.disabled = false;

    if (data.success && data.item) {
      if (data.becameReady) {
        showToast(`🎉 Boa notícia! "${data.item.name}" já tem versão limpa disponível em ${data.item.bestQuality}!`, 'success');
      } else {
        showToast(`Verificado: ${data.item.name} (${data.item.bestQuality} - ${data.item.streamCount} fontes)`, 'info');
      }
      await loadWatchlist();
    }
  } catch (err) {
    console.error('Erro ao checar item:', err);
    btnElement.innerHTML = '🔄 Rechecar';
    btnElement.disabled = false;
    showToast('Falha ao verificar qualidade.', 'error');
  }
}

// Recheck All Pending Items
async function handleCheckAllPending() {
  const icon = btnCheckAllPending.querySelector('.spin-icon');
  try {
    icon.classList.add('spinning');
    btnCheckAllPending.disabled = true;
    showToast('Rechecando fontes para todos os itens aguardando...', 'info');

    const res = await fetch('/api/check-all', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ forceAll: false })
    });

    const data = await res.json();
    icon.classList.remove('spinning');
    btnCheckAllPending.disabled = false;

    if (data.success) {
      if (data.newlyReady > 0) {
        showToast(`🎉 ${data.newlyReady} novo(s) filme(s) saíram de CAM e já estão prontos para assistir!`, 'success');
      } else {
        showToast(`Verificação concluída. Nenhum novo lançamento detectado no momento.`, 'info');
      }
      await loadWatchlist();
    }
  } catch (err) {
    icon.classList.remove('spinning');
    btnCheckAllPending.disabled = false;
    showToast('Erro ao verificar pendentes.', 'error');
  }
}

// Delete Item
async function handleDeleteItem(id) {
  const item = allItems.find(i => i.id === id);
  const name = item ? item.name : 'este item';
  if (!confirm(`Deseja remover "${name}" da sua Watchlist?`)) return;

  try {
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) {
      allItems = allItems.filter(i => i.id !== id);
      localStorage.setItem('watchlist_cached_items', JSON.stringify(allItems));
      showToast(`Item removido da watchlist.`, 'info');
      await loadWatchlist();
    }
  } catch (err) {
    console.error('Erro ao remover:', err);
    showToast('Erro ao remover item.', 'error');
  }
}

// Settings Modal
function openSettings() {
  settingsModal.classList.remove('hidden');
  fetch('/api/settings', { headers: getAuthHeaders() })
    .then(r => r.json())
    .then(settings => {
      if (settings) {
        document.getElementById('settingInterval').value = settings.autoCheckIntervalMinutes || 30;
        document.getElementById('settingTorrentioUrl').value = settings.torrentioUrl || 'https://torrentio.strem.fun';

        const enabled = settings.enabledCatalogs || ['watchlist_ready', 'watchlist_all', 'watchlist_pending'];
        const catReady = document.getElementById('catReady');
        const catAll = document.getElementById('catAll');
        const catPending = document.getElementById('catPending');
        if (catReady) catReady.checked = enabled.includes('watchlist_ready');
        if (catAll) catAll.checked = enabled.includes('watchlist_all');
        if (catPending) catPending.checked = enabled.includes('watchlist_pending');
      }
    })
    .catch(err => {
      console.error('Erro ao carregar configurações:', err);
    });
}

function closeSettings() {
  settingsModal.classList.add('hidden');
}

async function saveSettings() {
  const interval = parseInt(document.getElementById('settingInterval').value, 10) || 30;
  const torrentioUrl = document.getElementById('settingTorrentioUrl').value.trim();

  const enabledCatalogs = [];
  if (document.getElementById('catReady')?.checked) enabledCatalogs.push('watchlist_ready');
  if (document.getElementById('catAll')?.checked) enabledCatalogs.push('watchlist_all');
  if (document.getElementById('catPending')?.checked) enabledCatalogs.push('watchlist_pending');

  if (enabledCatalogs.length === 0) {
    showToast('Selecione pelo menos uma lista para exibir no Stremio.', 'error');
    return;
  }

  const btnSave = document.getElementById('btnSaveSettings');
  const oldText = btnSave.textContent;

  try {
    btnSave.textContent = 'Salvando e sincronizando...';
    btnSave.disabled = true;

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        autoCheckIntervalMinutes: interval,
        torrentioUrl: torrentioUrl || 'https://torrentio.strem.fun',
        enabledCatalogs
      })
    });

    btnSave.textContent = oldText;
    btnSave.disabled = false;

    if (res.ok) {
      showToast('Configurações salvas e Addon sincronizado no Stremio!', 'success');
      closeSettings();
    } else {
      showToast('Erro ao salvar configurações.', 'error');
    }
  } catch (err) {
    btnSave.textContent = oldText;
    btnSave.disabled = false;
    showToast('Erro ao salvar configurações.', 'error');
  }
}

// Handle Import Backup
async function handleImportBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const items = JSON.parse(event.target.result);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.addedCount} itens importados com sucesso!`, 'success');
        closeSettings();
        await loadWatchlist();
      }
    } catch (err) {
      showToast('Arquivo JSON inválido.', 'error');
    }
  };
  reader.readAsText(file);
}

// Toast Notifications
function showToast(message, type = 'info') {
  // Evita empilhar avisos idênticos na tela
  toastContainer.querySelectorAll('.toast').forEach(existing => {
    if (existing.dataset.msg === message) {
      existing.remove();
    }
  });

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.dataset.msg = message;
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

