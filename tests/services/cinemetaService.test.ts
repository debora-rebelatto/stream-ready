import { cinemetaService } from '../../src/services/cinemetaService';

describe('cinemetaService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('searchMovies', () => {
    test('deve retornar array vazio se query for vazia ou apenas espaços', async () => {
      expect(await cinemetaService.searchMovies('')).toEqual([]);
      expect(await cinemetaService.searchMovies('   ')).toEqual([]);
    });

    test('deve consultar getMeta diretamente quando query for IMDb ID válido', async () => {
      const mockMeta = {
        id: 'tt1375666',
        type: 'movie',
        name: 'Inception',
        year: '2010',
        poster: 'https://image.tmdb.org/poster.jpg',
        banner: 'https://image.tmdb.org/banner.jpg',
        genres: ['Action', 'Sci-Fi'],
        description: 'A thief who steals corporate secrets...',
        imdbRating: '8.8',
      };

      const getMetaSpy = jest.spyOn(cinemetaService, 'getMeta').mockResolvedValue(mockMeta);

      const results = await cinemetaService.searchMovies('tt1375666');
      expect(getMetaSpy).toHaveBeenCalledWith('movie', 'tt1375666');
      expect(results).toEqual([mockMeta]);
    });

    test('deve retornar array vazio se getMeta retornar null para IMDb ID', async () => {
      jest.spyOn(cinemetaService, 'getMeta').mockResolvedValue(null);

      const results = await cinemetaService.searchMovies('tt0000000');
      expect(results).toEqual([]);
    });

    test('deve buscar no catálogo Cinemeta e mapear resultados para busca por texto', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          metas: [
            {
              id: 'tt0816692',
              type: 'movie',
              name: 'Interstellar',
              year: '2014',
              poster: 'poster.jpg',
              background: 'background.jpg',
              genres: ['Adventure', 'Drama', 'Sci-Fi'],
              description: 'A team of explorers...',
              imdbRating: '8.7',
            },
            {
              id: 'tt1234567',
              name: 'Unknown Movie',
              releaseInfo: '2023',
            },
          ],
        }),
      });

      const results = await cinemetaService.searchMovies('Interstellar');
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'tt0816692',
        type: 'movie',
        name: 'Interstellar',
        year: '2014',
        poster: 'poster.jpg',
        banner: 'background.jpg',
        genres: ['Adventure', 'Drama', 'Sci-Fi'],
        description: 'A team of explorers...',
        imdbRating: '8.7',
      });
      expect(results[1]).toEqual({
        id: 'tt1234567',
        type: 'movie',
        name: 'Unknown Movie',
        year: '2023',
        poster: '',
        banner: '',
        genres: [],
        description: '',
        imdbRating: '',
      });
    });

    test('deve retornar array vazio quando resposta HTTP não for ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await cinemetaService.searchMovies('Erro');
      expect(results).toEqual([]);
    });

    test('deve capturar exceção de rede e retornar array vazio', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      global.fetch = jest.fn().mockRejectedValue(new Error('Falha de conexão'));

      const results = await cinemetaService.searchMovies('Timeout');
      expect(results).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('getMeta', () => {
    test('deve retornar detalhes completos do filme quando encontrado', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meta: {
            id: 'tt1375666',
            type: 'movie',
            name: 'Inception',
            year: '2010',
            poster: 'poster.jpg',
            banner: 'banner.jpg',
            genres: ['Sci-Fi'],
            description: 'Dream within a dream',
            imdbRating: '8.8',
          },
        }),
      });

      const meta = await cinemetaService.getMeta('movie', 'tt1375666');
      expect(meta).toEqual({
        id: 'tt1375666',
        type: 'movie',
        name: 'Inception',
        year: '2010',
        poster: 'poster.jpg',
        banner: 'banner.jpg',
        genres: ['Sci-Fi'],
        description: 'Dream within a dream',
        imdbRating: '8.8',
      });
    });

    test('deve retornar null se resposta não for ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const meta = await cinemetaService.getMeta('movie', 'tt0000000');
      expect(meta).toBeNull();
    });

    test('deve retornar null se JSON não tiver campo meta', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const meta = await cinemetaService.getMeta('movie', 'tt1234567');
      expect(meta).toBeNull();
    });

    test('deve retornar null se fetch disparar exceção', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

      const meta = await cinemetaService.getMeta('movie', 'tt1234567');
      expect(meta).toBeNull();
    });
  });
});
