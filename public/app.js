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
const btnSyncLibrary = document.getElementById('btnSyncLibrary');
const btnInstallAccountDirect = document.getElementById('btnInstallAccountDirect');

const loginModal = document.getElementById('loginModal');
const btnCloseLoginModal = document.getElementById('btnCloseLoginModal');
const loginTabButtons = document.querySelectorAll('.login-tab-btn');
const formLoginCredentials = document.getElementById('formLoginCredentials');
const formLoginAuthKey = document.getElementById('formLoginAuthKey');

const toastContainer = document.getElementById('toastContainer');

// Init
document.addEventListener('DOMContentLoaded', async () => {
  setupAddonLinks();
  await checkAuthStatus();
  await loadWatchlist();
  setupEventListeners();
  setupAuthEventListeners();
});

// -------------------------------------------------------------
// STREMIO AUTHENTICATION & LIBRARY SYNC
// -------------------------------------------------------------

async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.loggedIn && data.user) {
      setAuthUI(true, data.user);
    } else {
      setAuthUI(false, null);
    }
  } catch (err) {
    setAuthUI(false, null);
  }
}

function setAuthUI(isLoggedIn, user) {
  currentUser = user;
  if (isLoggedIn && user) {
    btnOpenLogin.classList.add('hidden');
    userLoggedInMenu.classList.remove('hidden');
    userEmailDisplay.textContent = user.email || 'Conectado';
    accountSyncCard.classList.remove('hidden');
    syncUserEmail.textContent = user.email;
  } else {
    btnOpenLogin.classList.remove('hidden');
    userLoggedInMenu.classList.add('hidden');
    accountSyncCard.classList.add('hidden');
    currentUser = null;
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
      loginModal.classList.add('hidden');
      setAuthUI(true, data.user);
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
      loginModal.classList.add('hidden');
      setAuthUI(true, data.user);
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Validar AuthKey';
      showToast('Erro ao validar chave.', 'error');
    }
  });

  // Logout
  btnLogout.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAuthUI(false, null);
      showToast('Desconectado com sucesso.', 'info');
    } catch (err) {
      console.error(err);
    }
  });

  // Sync Stremio Library
  btnSyncLibrary.addEventListener('click', async () => {
    const icon = btnSyncLibrary.querySelector('.spin-icon');
    try {
      icon.classList.add('spinning');
      btnSyncLibrary.disabled = true;
      showToast('Puxando filmes da sua biblioteca do Stremio e verificando 1080p+...', 'info');

      const res = await fetch('/api/auth/sync-library', { method: 'POST' });
      const data = await res.json();

      icon.classList.remove('spinning');
      btnSyncLibrary.disabled = false;

      if (!res.ok || data.error) {
        showToast(data.error || 'Erro ao sincronizar biblioteca.', 'error');
        return;
      }

      showToast(`🎉 Sincronizado! ${data.addedCount} novo(s) filme(s) adicionados à sua Watchlist!`, 'success');
      await loadWatchlist();
    } catch (err) {
      icon.classList.remove('spinning');
      btnSyncLibrary.disabled = false;
      showToast('Erro de comunicação ao sincronizar.', 'error');
    }
  });

  // Direct 1-Click Install to Account
  btnInstallAccountDirect.addEventListener('click', async () => {
    try {
      btnInstallAccountDirect.disabled = true;
      btnInstallAccountDirect.textContent = 'Ativando na conta...';
      showToast('Instalando addon diretamente na sua conta do Stremio...', 'info');

      const res = await fetch('/api/auth/install-account', { method: 'POST' });
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
    const res = await fetch('/api/info');
    const info = await res.json();
    
    // Links based on Cloud (Render) vs Local
    const manifestUrl = info.manifestUrl;
    const installUrl = info.stremioInstallUrl;
    const webInstallUrl = info.webStremioInstallUrl;

    // Top buttons
    btnInstallStremio.href = installUrl;

    const btnInstallWeb = document.getElementById('btnInstallWeb');
    if (btnInstallWeb) {
      btnInstallWeb.href = webInstallUrl;
    }

    // Banner display
    const manifestUrlDisplay = document.getElementById('manifestUrlDisplay');
    if (manifestUrlDisplay) {
      manifestUrlDisplay.textContent = manifestUrl;
    }

    const statusBannerTitle = document.getElementById('statusBannerTitle');
    const statusBannerDesc = document.getElementById('statusBannerDesc');
    const statusBannerIcon = document.getElementById('statusBannerIcon');

    if (statusBannerIcon) statusBannerIcon.textContent = '🌐';
    if (statusBannerTitle) statusBannerTitle.textContent = 'Addon Online (HTTPS)';
    if (statusBannerDesc) statusBannerDesc.textContent = 'Link oficial permanente do manifesto para Smart TV, Celular e PC:';

    // Copy buttons
    const btnCopyManifestPill = document.getElementById('btnCopyManifestPill');
    if (btnCopyManifestPill) {
      btnCopyManifestPill.addEventListener('click', () => {
        navigator.clipboard.writeText(manifestUrl).then(() => {
          showToast(`Link copiado: ${manifestUrl}`, 'success');
        }).catch(() => {
          prompt('Copie o link do Addon abaixo:', manifestUrl);
        });
      });
    }

    btnCopyLink.addEventListener('click', () => {
      navigator.clipboard.writeText(manifestUrl).then(() => {
        showToast('Link do manifesto copiado! Cole na busca de Addons do Stremio.', 'success');
      }).catch(() => {
        prompt('Copie o link do Addon abaixo:', manifestUrl);
      });
    });
  } catch (err) {
    console.error('Erro ao obter info do servidor:', err);
    btnInstallStremio.href = `stremio://${window.location.host}/manifest.json`;
  }
}

// Event Listeners
function setupEventListeners() {
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
  btnCloseModal.addEventListener('click', closeSettings);
  settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettings);
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);

  // Backup Import/Export
  document.getElementById('btnExportJson').addEventListener('click', () => {
    window.location.href = '/api/export';
  });

  const importInput = document.getElementById('importFileInput');
  importInput.addEventListener('change', handleImportBackup);
}

// Load Watchlist Data
async function loadWatchlist() {
  try {
    const res = await fetch('/api/items');
    const data = await res.json();
    allItems = data.items || [];
    updateStats(data.stats);
    renderItems();
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
  let filtered = allItems;
  if (currentTab === 'ready') {
    filtered = allItems.filter(i => i.has1080pPlus);
  } else if (currentTab === 'pending') {
    filtered = allItems.filter(i => !i.has1080pPlus);
  }

  if (filtered.length === 0) {
    let emptyMsg = 'Sua watchlist está vazia.';
    if (currentTab === 'ready') emptyMsg = 'Nenhum filme disponível em 1080p+ ainda.';
    if (currentTab === 'pending') emptyMsg = 'Nenhum filme aguardando 1080p!';

    watchlistContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${currentTab === 'ready' ? '🎬' : '⏳'}</div>
        <h3>${emptyMsg}</h3>
        <p>Use a barra de busca acima para pesquisar e monitorar novos lançamentos.</p>
      </div>
    `;
    return;
  }

  watchlistContainer.innerHTML = filtered.map(item => {
    const ready = item.has1080pPlus;
    const badgeClass = ready ? 'ready' : 'pending';
    const badgeText = ready ? '🟢 1080p+ PRONTO' : '⏳ AGUARDANDO';
    const qualityText = item.bestQuality || 'Pendente';
    const streamsText = item.streamCount > 0 ? `${item.streamCount} fontes` : '0 fontes';
    const stremioUrl = `stremio://detail/movie/${item.id}`;

    return `
      <div class="movie-card" data-id="${item.id}">
        <div class="poster-wrap">
          <img class="poster-img" src="${item.poster || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%231e2235%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%239ca3af%22 text-anchor=%22middle%22>Sem Imagem</text></svg>'}" alt="${item.name}" loading="lazy">
          <div class="poster-badge ${badgeClass}">${badgeText}</div>
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
          <div class="card-actions">
            <a href="${stremioUrl}" class="btn-card-action" title="Abrir no app Stremio">
              🎬 Abrir
            </a>
            <button class="btn-card-action btn-check-item" data-id="${item.id}" title="Verificar qualidade agora">
              🔄 Rechecar
            </button>
            <button class="btn-card-action btn-card-remove btn-delete-item" data-id="${item.id}" title="Remover da watchlist">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  watchlistContainer.querySelectorAll('.btn-check-item').forEach(btn => {
    btn.addEventListener('click', () => handleCheckSingle(btn.dataset.id, btn));
  });

  watchlistContainer.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteItem(btn.dataset.id));
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'movie' })
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      showToast(data.error || 'Erro ao adicionar filme.', 'error');
      return;
    }

    const item = data.item;
    if (item.has1080pPlus) {
      showToast(`🎉 "${item.name}" adicionado! Já está DISPONÍVEL em ${item.bestQuality}!`, 'success');
    } else {
      showToast(`⏳ "${item.name}" adicionado! Aguardando versão 1080p+.`, 'info');
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

    const res = await fetch(`/api/check/${id}`, { method: 'POST' });
    const data = await res.json();

    btnElement.innerHTML = originalText;
    btnElement.disabled = false;

    if (data.success && data.item) {
      if (data.becameReady) {
        showToast(`🎉 Boa notícia! "${data.item.name}" agora está disponível em ${data.item.bestQuality}!`, 'success');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceAll: false })
    });

    const data = await res.json();
    icon.classList.remove('spinning');
    btnCheckAllPending.disabled = false;

    if (data.success) {
      if (data.newlyReady > 0) {
        showToast(`🎉 ${data.newlyReady} novo(s) filme(s) atingiram qualidade 1080p+!`, 'success');
      } else {
        showToast(`Verificação concluída. Nenhum novo lançamento 1080p+ detectado no momento.`, 'info');
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
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Item removido da watchlist.`, 'info');
      await loadWatchlist();
    }
  } catch (err) {
    console.error('Erro ao remover:', err);
    showToast('Erro ao remover item.', 'error');
  }
}

// Settings Modal
async function openSettings() {
  try {
    const res = await fetch('/api/settings');
    const settings = await res.json();
    document.getElementById('settingInterval').value = settings.autoCheckIntervalMinutes || 30;
    document.getElementById('settingTorrentioUrl').value = settings.torrentioUrl || 'https://torrentio.strem.fun';
  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsModal.classList.add('hidden');
}

async function saveSettings() {
  const interval = parseInt(document.getElementById('settingInterval').value, 10) || 30;
  const torrentioUrl = document.getElementById('settingTorrentioUrl').value.trim();

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoCheckIntervalMinutes: interval,
        torrentioUrl: torrentioUrl || 'https://torrentio.strem.fun'
      })
    });
    if (res.ok) {
      showToast('Configurações salvas com sucesso!', 'success');
      closeSettings();
    }
  } catch (err) {
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
        headers: { 'Content-Type': 'application/json' },
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
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
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

