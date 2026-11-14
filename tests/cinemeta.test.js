const { searchMovies, getMeta } = require('../lib/cinemeta');

describe('Cinemeta Module (lib/cinemeta.js)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('searchMovies', () => {
    test('deve retornar array vazio se query for vazia', async () => {
      expect(await searchMovies('')).toEqual([]);
      expect(await searchMovies('  ')).toEqual([]);
    });

    test('deve buscar por IMDb ID diretamente via getMeta', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meta: {
            id: 'tt1375666',
            name: 'Inception',
            year: '2010'
          }
        })
      });

      const res = await searchMovies('tt1375666');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('tt1375666');
    });

    test('deve buscar no catálogo Cinemeta por texto', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          metas: [
            { id: 'tt0816692', name: 'Interstellar', year: '2014' }
          ]
        })
      });

      const res = await searchMovies('Interstellar');
      expect(res).toHaveLength(1);
      expect(res[0].name).toBe('Interstellar');
    });

    test('deve retornar array vazio se a resposta for 500 ou de erro', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      const res = await searchMovies('Failed Query');
      expect(res).toEqual([]);
    });

    test('deve capturar erro se fetch falhar', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const res = await searchMovies('Timeout');
      expect(res).toEqual([]);
      errSpy.mockRestore();
    });
  });

  describe('getMeta', () => {
    test('deve retornar objeto meta mapeado com sucesso', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meta: {
            id: 'tt1375666',
            name: 'Inception',
            year: '2010',
            poster: 'poster.jpg',
            genres: ['Sci-Fi']
          }
        })
      });

      const meta = await getMeta('movie', 'tt1375666');
      expect(meta).toMatchObject({
        id: 'tt1375666',
        name: 'Inception',
        year: '2010',
        genres: ['Sci-Fi']
      });
    });

    test('deve retornar null se status não for ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const meta = await getMeta('movie', 'tt0000000');
      expect(meta).toBeNull();
    });

    test('deve retornar null se response json não tiver meta', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const meta = await getMeta('movie', 'tt0000000');
      expect(meta).toBeNull();
    });

    test('deve retornar null se fetch falhar', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      const meta = await getMeta('movie', 'tt0000000');
      expect(meta).toBeNull();
      errSpy.mockRestore();
    });
  });
});
