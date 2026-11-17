import {
  api,
  getAuthKey,
  setAuthKey,
  clearAuth,
  getAuthHeaders,
} from '../../src/lib/api';

describe('API Client (src/lib/api.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Headers e autenticação', () => {
    test('getAuthHeaders deve incluir x-stremio-auth quando houver authKey', () => {
      setAuthKey('token_123');
      const headers = getAuthHeaders() as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-stremio-auth']).toBe('token_123');
    });

    test('getAuthHeaders não deve incluir x-stremio-auth se deslogado', () => {
      clearAuth();
      const headers = getAuthHeaders() as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['x-stremio-auth']).toBeUndefined();
    });
  });

  describe('getAuthStatus', () => {
    test('deve retornar não logado se não houver authKey no localStorage', async () => {
      clearAuth();
      const status = await api.getAuthStatus();
      expect(status).toEqual({ loggedIn: false, isUnauthorized: true });
    });

    test('deve retornar não logado se a API responder 401', async () => {
      setAuthKey('token_invalido');
      global.fetch = jest.fn().mockResolvedValue({
        status: 401,
        ok: false,
      });

      const status = await api.getAuthStatus();
      expect(status).toEqual({ loggedIn: false, isUnauthorized: true });
    });

    test('deve retornar não logado se a API responder erro 500', async () => {
      setAuthKey('token_valido');
      global.fetch = jest.fn().mockResolvedValue({
        status: 500,
        ok: false,
      });

      const status = await api.getAuthStatus();
      expect(status).toEqual({ loggedIn: false, isUnauthorized: false });
    });

    test('deve retornar dados do usuário quando autenticado com sucesso', async () => {
      setAuthKey('token_valido');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ loggedIn: true, user: { id: 'u1', email: 'test@mail.com' } }),
      });

      const status = await api.getAuthStatus();
      expect(status).toEqual({
        loggedIn: true,
        user: { id: 'u1', email: 'test@mail.com' },
        isUnauthorized: false,
      });
    });

    test('deve capturar falha de rede e retornar não logado', async () => {
      setAuthKey('token_valido');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValue(new Error('Falha de rede'));

      const status = await api.getAuthStatus();
      expect(status).toEqual({ loggedIn: false, isUnauthorized: false });
      warnSpy.mockRestore();
    });
  });

  describe('login e logout', () => {
    test('login deve enviar credenciais via POST para /api/auth/login', async () => {
      const mockResult = { success: true, authKey: 'k123', user: { id: 'u1', email: 'a@b.com' } };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const res = await api.login({ email: 'a@b.com', password: '123' });
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'a@b.com', password: '123' }),
      }));
      expect(res).toEqual(mockResult);
    });

    test('logout deve chamar endpoint e limpar dados locais mesmo se houver erro', async () => {
      setAuthKey('key_logout', 'email@test.com');
      global.fetch = jest.fn().mockRejectedValue(new Error('Network fail on logout'));

      await api.logout();
      expect(getAuthKey()).toBeNull();
      expect(localStorage.getItem('stremioEmail')).toBeNull();
    });
  });

  describe('endpoints de watchlist, itens e filmes', () => {
    beforeEach(() => {
      setAuthKey('test_key');
    });

    test('installToAccount deve chamar /api/auth/install-account', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });
      const res = await api.installToAccount();
      expect(res).toEqual({ success: true });
    });

    test('getItems deve incluir query parameter de filtro se informado', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ items: [], stats: {}, requireAuth: false }),
      });

      await api.getItems('ready');
      expect(global.fetch).toHaveBeenCalledWith('/api/items?filter=ready', expect.any(Object));

      await api.getItems();
      expect(global.fetch).toHaveBeenCalledWith('/api/items', expect.any(Object));
    });

    test('searchMovies deve retornar array vazio se query for vazia', async () => {
      const res = await api.searchMovies('   ');
      expect(res).toEqual([]);
    });

    test('searchMovies deve consultar /api/search?q=...', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => [{ id: 'tt1' }],
      });
      const res = await api.searchMovies('Matrix');
      expect(global.fetch).toHaveBeenCalledWith('/api/search?q=Matrix');
      expect(res).toEqual([{ id: 'tt1' }]);
    });

    test('addItem, deleteItem, setWatched, setItemMinQuality', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });

      await api.addItem('tt123', 'movie');
      expect(global.fetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({ method: 'POST' }));

      await api.deleteItem('tt123');
      expect(global.fetch).toHaveBeenCalledWith('/api/items/tt123', expect.objectContaining({ method: 'DELETE' }));

      await api.setWatched('tt123', true);
      expect(global.fetch).toHaveBeenCalledWith('/api/items/tt123/watched', expect.objectContaining({ method: 'POST' }));

      await api.setItemMinQuality('tt123', '4k');
      expect(global.fetch).toHaveBeenCalledWith('/api/items/tt123/min-quality', expect.objectContaining({ method: 'POST' }));
    });

    test('syncWatchedFromStremio, recheckSingle, recheckAll', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });

      await api.syncWatchedFromStremio();
      expect(global.fetch).toHaveBeenCalledWith('/api/items/sync-watched', expect.any(Object));

      await api.recheckSingle('tt123');
      expect(global.fetch).toHaveBeenCalledWith('/api/check/tt123', expect.any(Object));

      await api.recheckAll(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/check-all', expect.objectContaining({
        body: JSON.stringify({ forceAll: true }),
      }));
    });

    test('getSettings e saveSettings', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ minQuality: '1080p' }),
      });

      await api.getSettings();
      expect(global.fetch).toHaveBeenCalledWith('/api/settings', expect.any(Object));

      await api.saveSettings({ minQuality: '4k' });
      expect(global.fetch).toHaveBeenCalledWith('/api/settings', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ minQuality: '4k' }),
      }));
    });

    test('getInfo, exportBackup e importBackup', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.getInfo();
      expect(global.fetch).toHaveBeenCalledWith('/api/info', expect.any(Object));

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ([{ id: 'tt1' }]),
      });

      const backup = await api.exportBackup();
      expect(global.fetch).toHaveBeenCalledWith('/api/export', expect.any(Object));
      expect(backup).toEqual([{ id: 'tt1' }]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.importBackup([{ id: 'tt1' }] as any);
      expect(global.fetch).toHaveBeenCalledWith('/api/import', expect.objectContaining({
        method: 'POST',
      }));
    });

    test('custom lists endpoints (get, create, update, delete, setItemCustomLists)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ success: true }),
      });

      await api.getCustomLists();
      expect(global.fetch).toHaveBeenCalledWith('/api/lists', expect.any(Object));

      await api.createCustomList('Anime', '🍙');
      expect(global.fetch).toHaveBeenCalledWith('/api/lists', expect.objectContaining({ method: 'POST' }));

      await api.updateCustomList('l1', 'Animes', '🎌');
      expect(global.fetch).toHaveBeenCalledWith('/api/lists/l1', expect.objectContaining({ method: 'PUT' }));

      await api.deleteCustomList('l1');
      expect(global.fetch).toHaveBeenCalledWith('/api/lists/l1', expect.objectContaining({ method: 'DELETE' }));

      await api.setItemCustomLists('tt123', ['l1']);
      expect(global.fetch).toHaveBeenCalledWith('/api/items/tt123/lists', expect.objectContaining({ method: 'POST' }));
    });

    test('curated lists endpoints (getCuratedLists, addCuratedList)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ success: true, lists: [{ id: 'new_netflix' }] }),
      });

      const listsRes = await api.getCuratedLists();
      expect(global.fetch).toHaveBeenCalledWith('/api/curated-lists', expect.any(Object));
      expect(listsRes.success).toBe(true);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify({ success: true, list: { id: 'list_1', name: 'New on Netflix' } }),
      });

      const addRes = await api.addCuratedList('new_netflix');
      expect(global.fetch).toHaveBeenCalledWith('/api/curated-lists/new_netflix/add', expect.objectContaining({ method: 'POST' }));
      expect(addRes.success).toBe(true);

      // Gracefully handles empty or network failure
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 504,
        text: async () => '',
      });
      const failRes = await api.addCuratedList('new_netflix');
      expect(failRes.success).toBe(false);
      expect(failRes.error).toBeDefined();
    });

    test('deleteAccount calls DELETE /api/auth/account with auth headers', async () => {
      setAuthKey('token_to_delete');
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Account deleted' }),
      });

      const res = await api.deleteAccount();
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/account', expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'x-stremio-auth': 'token_to_delete',
        }),
      }));
      expect(res.success).toBe(true);
    });
  });
});
