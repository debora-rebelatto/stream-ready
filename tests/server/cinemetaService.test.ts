import { searchMovies, getMeta, cinemetaService } from '../../server/services/cinemetaService.ts';

describe('Backend CinemetaService (server/services/cinemetaService.ts)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('searchMovies', () => {
    test('deve retornar array vazio se query for vazia ou whitespace', async () => {
      expect(await searchMovies('')).toEqual([]);
      expect(await searchMovies('   ')).toEqual([]);
    });

    test('deve buscar por IMDb ID diretamente via getMeta', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meta: {
            id: 'tt1375666',
            name: 'Inception',
            year: '2010',
            poster: 'https://example.com/poster.jpg'
          }
        })
      });

      const res = await searchMovies('tt1375666');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('tt1375666');
      expect(res[0].name).toBe('Inception');
    });

    test('deve buscar no catálogo Cinemeta por texto', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          metas: [
            { id: 'tt0816692', name: 'Interstellar', year: '2014', genres: ['Sci-Fi'] }
          ]
        })
      });

      const res = await searchMovies('Interstellar');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('tt0816692');
      expect(res[0].name).toBe('Interstellar');
      expect(res[0].genres).toContain('Sci-Fi');
    });

    test('deve filtrar e não retornar séries no resultado de busca', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          metas: [
            { id: 'tt0903747', name: 'Breaking Bad', type: 'series' },
            { id: 'tt0816692', name: 'Interstellar', type: 'movie' }
          ]
        })
      });

      const res = await searchMovies('Breaking');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('tt0816692');
      expect(res[0].name).toBe('Interstellar');
    });

    test('deve retornar vazio se a API retornar erro HTTP', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      const res = await searchMovies('Avatar');
      expect(res).toEqual([]);
    });

    test('deve capturar falha de rede e retornar array vazio', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

      const res = await searchMovies('Matrix');
      expect(res).toEqual([]);
    });
  });

  describe('getMeta', () => {
    test('deve retornar metadados completos de um filme válido', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meta: {
            id: 'tt0111161',
            name: 'The Shawshank Redemption',
            year: '1994',
            runtime: '142 min',
            director: ['Frank Darabont'],
            cast: ['Tim Robbins', 'Morgan Freeman']
          }
        })
      });

      const meta = await getMeta('movie', 'tt0111161');
      expect(meta).not.toBeNull();
      expect(meta?.id).toBe('tt0111161');
      expect(meta?.name).toBe('The Shawshank Redemption');
      expect(meta?.director).toEqual(['Frank Darabont']);
    });

    test('deve retornar null se meta não for encontrado', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const meta = await getMeta('movie', 'tt0000000');
      expect(meta).toBeNull();
    });

    test('deve retornar null se o item for uma série', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meta: {
            id: 'tt0903747',
            name: 'Breaking Bad',
            type: 'series'
          }
        })
      });

      const meta = await getMeta('series', 'tt0903747');
      expect(meta).toBeNull();
    });

    test('deve retornar null em caso de erro HTTP', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const meta = await getMeta('movie', 'invalid');
      expect(meta).toBeNull();
    });
  });

  test('objeto cinemetaService deve exportar as funções', () => {
    expect(typeof cinemetaService.searchMovies).toBe('function');
    expect(typeof cinemetaService.getMeta).toBe('function');
  });
});

