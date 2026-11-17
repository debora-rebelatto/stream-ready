import {
  loginStremio,
  getUserInfo,
  installAddonToAccount,
  getAccountWatchlist,
  saveAccountWatchlist,
  getStremioWatchedMovies,
  stremioAuthService,
} from '../../server/services/stremioAuthService.ts';

describe('Backend StremioAuthService (server/services/stremioAuthService.ts)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('loginStremio', () => {
    test('deve autenticar com sucesso e retornar authKey', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: {
            authKey: 'mock_stremio_auth_token_xyz',
            user: { _id: 'user_123', email: 'test@example.com' },
          },
        }),
      });

      const res = await loginStremio('test@example.com', 'password123');
      expect(res.success).toBe(true);
      expect(res.authKey).toBe('mock_stremio_auth_token_xyz');
      expect(res.user?.email).toBe('test@example.com');
    });

    test('deve retornar erro em caso de credenciais inválidas', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          error: { message: 'USER_ERR_BAD_CREDENTIALS' },
        }),
      });

      const res = await loginStremio('wrong@example.com', 'wrongpass');
      expect(res.success).toBe(false);
      expect(res.error).toBe('USER_ERR_BAD_CREDENTIALS');
    });
  });

  describe('getUserInfo', () => {
    test('deve retornar dados do usuário para authKey válido', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: { _id: 'stremio_user_999', email: 'user@stremio.com' },
        }),
      });

      const user = await getUserInfo('valid_token');
      expect(user).not.toBeNull();
      expect(user?.id).toBe('stremio_user_999');
      expect(user?.email).toBe('user@stremio.com');
    });

    test('deve retornar null se o authKey for inválido', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: { message: 'Invalid session' } }),
      });

      const user = await getUserInfo('expired_token');
      expect(user).toBeNull();
    });
  });

  describe('isLegitimateMovieId', () => {
    test('should accept standard IMDb IDs (tt followed by numbers)', () => {
      expect(stremioAuthService.isLegitimateMovieId('tt1375666')).toBe(true);
      expect(stremioAuthService.isLegitimateMovieId('tt0111161')).toBe(true);
      expect(stremioAuthService.isLegitimateMovieId('tt12345678')).toBe(true);
    });

    test('should accept TMDB IDs (tmdb: followed by numbers)', () => {
      expect(stremioAuthService.isLegitimateMovieId('tmdb:550')).toBe(true);
      expect(stremioAuthService.isLegitimateMovieId('tmdb:123456')).toBe(true);
    });

    test('should reject third-party debrid utility IDs and non-movie identifiers', () => {
      expect(stremioAuthService.isLegitimateMovieId('dlrealdebrid')).toBe(false);
      expect(stremioAuthService.isLegitimateMovieId('delete_all_files')).toBe(false);
      expect(stremioAuthService.isLegitimateMovieId('realdebrid:delete')).toBe(false);
      expect(stremioAuthService.isLegitimateMovieId('kitsu:123')).toBe(false);
      expect(stremioAuthService.isLegitimateMovieId('')).toBe(false);
      expect(stremioAuthService.isLegitimateMovieId(null)).toBe(false);
      expect(stremioAuthService.isLegitimateMovieId(undefined)).toBe(false);
    });
  });

  describe('getStremioWatchedMovies', () => {
    test('deve extrair filmes assistidos da biblioteca do Stremio', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: [
            {
              _id: 'tt1375666',
              name: 'Inception',
              type: 'movie',
              state: { flaggedWatched: 1, timesWatched: 1 },
            },
            {
              _id: 'tt9999999',
              name: 'Unwatched Movie',
              type: 'movie',
              state: { flaggedWatched: 0, timesWatched: 0 },
            },
          ],
        }),
      });

      const watched = await getStremioWatchedMovies('token');
      expect(watched).toHaveLength(1);
      expect(watched[0].id).toBe('tt1375666');
      expect(watched[0].isWatched).toBe(true);
    });

    test('should ignore third-party utility items like MediaFusion delete all files', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          result: [
            {
              _id: 'dlrealdebrid',
              name: '🗑️💩 Delete all files',
              type: 'movie',
              poster: 'https://mediafusion.elfhosted.com/static/images/delete_all_poster.jpg',
              state: { flaggedWatched: 1, timesWatched: 1 },
            },
            {
              _id: 'tt0111161',
              name: 'The Shawshank Redemption',
              type: 'movie',
              state: { flaggedWatched: 1, timesWatched: 1 },
            },
          ],
        }),
      });

      const watched = await getStremioWatchedMovies('token');
      expect(watched).toHaveLength(1);
      expect(watched[0].id).toBe('tt0111161');
      expect(watched[0].name).toBe('The Shawshank Redemption');
    });
  });

  test('objeto stremioAuthService deve exportar as funções', () => {
    expect(typeof stremioAuthService.loginStremio).toBe('function');
    expect(typeof stremioAuthService.getUserInfo).toBe('function');
    expect(typeof stremioAuthService.installAddonToAccount).toBe('function');
    expect(typeof stremioAuthService.getAccountWatchlist).toBe('function');
    expect(typeof stremioAuthService.saveAccountWatchlist).toBe('function');
    expect(typeof stremioAuthService.getStremioWatchedMovies).toBe('function');
    expect(typeof stremioAuthService.isLegitimateMovieId).toBe('function');
  });
});
