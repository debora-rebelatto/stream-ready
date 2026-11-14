const {
  loginStremio,
  getUserInfo,
  installAddonToAccount,
  getStremioWatchedMovies
} = require('../lib/stremioAuth');

describe('StremioAuth Module (lib/stremioAuth.js)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('loginStremio', () => {
    test('deve autenticar com sucesso e retornar authKey e user', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          result: {
            authKey: 'auth_key_123',
            user: { _id: 'u_123', email: 'test@example.com' }
          }
        })
      });

      const res = await loginStremio('test@example.com', 'password123');
      expect(res.success).toBe(true);
      expect(res.authKey).toBe('auth_key_123');
      expect(res.user.email).toBe('test@example.com');
    });

    test('deve retornar erro se Stremio responder com erro de autenticação', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          error: { message: 'Invalid credentials' }
        })
      });

      const res = await loginStremio('wrong@mail.com', 'wrong');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid credentials');
    });

    test('deve capturar falha de conexão e retornar erro', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const res = await loginStremio('user@mail.com', 'pass');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Network offline');
      errSpy.mockRestore();
    });
  });

  describe('getUserInfo', () => {
    test('deve retornar id e email do usuário se authKey for válido', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          result: { _id: 'u_789', email: 'valid@example.com' }
        })
      });

      const user = await getUserInfo('valid_auth_key');
      expect(user).toEqual({ id: 'u_789', email: 'valid@example.com' });
    });

    test('deve retornar null se resposta contiver erro ou não contiver result', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({ error: { message: 'Expired' } })
      });

      const user = await getUserInfo('expired_key');
      expect(user).toBeNull();
    });

    test('deve retornar null se requisição falhar', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch error'));

      const user = await getUserInfo('bad_key');
      expect(user).toBeNull();
      errSpy.mockRestore();
    });
  });

  describe('installAddonToAccount', () => {
    test('deve adicionar addon à conta e salvar na coleção', async () => {
      global.fetch = jest.fn()
        // 1. addonCollectionGet
        .mockResolvedValueOnce({
          json: async () => ({
            result: { addons: [] }
          })
        })
        // 2. addonCollectionSet
        .mockResolvedValueOnce({
          json: async () => ({
            result: { success: true }
          })
        });

      const passedManifest = { id: 'community.watchlist', name: 'Watchlist Addon', version: '1.0.0' };
      const res = await installAddonToAccount('auth_123', 'https://domain.com/manifest.json', passedManifest);
      expect(res.success).toBe(true);
      expect(res.message).toContain('installed');
    });
  });

  describe('getStremioWatchedMovies', () => {
    test('deve filtrar apenas filmes assistidos com progresso alto ou marcados', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: async () => ({
          result: [
            {
              _id: 'tt100',
              name: 'Movie Watched Flag',
              type: 'movie',
              state: { flaggedWatched: 1 }
            },
            {
              _id: 'tt200',
              name: 'Movie Watched Ratio',
              type: 'movie',
              state: { timeOffset: 9500, duration: 10000 } // ratio = 0.95 (> 0.8)
            },
            {
              _id: 'tt300',
              name: 'Movie Unwatched',
              type: 'movie',
              state: { timeOffset: 500, duration: 10000 } // ratio = 0.05
            },
            {
              _id: 'tt400',
              name: 'Series Item',
              type: 'series',
              state: { flaggedWatched: 1 }
            }
          ]
        })
      });

      const watched = await getStremioWatchedMovies('auth_123');
      expect(watched).toHaveLength(2);
      expect(watched[0].id).toBe('tt100');
      expect(watched[1].id).toBe('tt200');
    });
  });
});
