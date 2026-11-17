import { watchlistService } from '../../src/services/watchlistService';
import { cinemetaService } from '../../src/services/cinemetaService';
import { api } from '../../src/lib/api';

describe('watchlistService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('searchMovies', () => {
    test('deve retornar resultados do cinemetaService se encontrados', async () => {
      const mockResults = [
        {
          id: 'tt1375666',
          type: 'movie',
          name: 'Inception',
          year: '2010',
          poster: 'p.jpg',
          banner: 'b.jpg',
          genres: ['Action'],
          description: 'Desc',
          imdbRating: '8.8',
        },
      ];

      const cinemetaSpy = jest.spyOn(cinemetaService, 'searchMovies').mockResolvedValue(mockResults);
      const apiSpy = jest.spyOn(api, 'searchMovies');

      const results = await watchlistService.searchMovies('Inception');
      expect(cinemetaSpy).toHaveBeenCalledWith('Inception');
      expect(apiSpy).not.toHaveBeenCalled();
      expect(results).toEqual(mockResults);
    });

    test('deve recorrer a api.searchMovies se cinemetaService retornar array vazio', async () => {
      const fallbackResults = [
        {
          id: 'tt0001',
          type: 'movie',
          name: 'Fallback Movie',
          year: '2022',
          poster: '',
          banner: '',
          genres: [],
          description: '',
          imdbRating: '',
        },
      ];

      jest.spyOn(cinemetaService, 'searchMovies').mockResolvedValue([]);
      const apiSpy = jest.spyOn(api, 'searchMovies').mockResolvedValue(fallbackResults);

      const results = await watchlistService.searchMovies('Rare Movie');
      expect(apiSpy).toHaveBeenCalledWith('Rare Movie');
      expect(results).toEqual(fallbackResults);
    });

    test('deve recorrer a api.searchMovies se cinemetaService lançar exceção', async () => {
      jest.spyOn(cinemetaService, 'searchMovies').mockRejectedValue(new Error('Network Cinemeta down'));
      const apiSpy = jest.spyOn(api, 'searchMovies').mockResolvedValue([]);

      const results = await watchlistService.searchMovies('Some Movie');
      expect(apiSpy).toHaveBeenCalledWith('Some Movie');
      expect(results).toEqual([]);
    });
  });

  describe('operações de itens e watchlist', () => {
    test('getWatchlist deve chamar api.getItems com o filtro fornecido', async () => {
      const mockData = {
        items: [],
        stats: { total: 0, ready: 0, pending: 0, watched: 0, unreleased: 0 },
        requireAuth: false,
      };
      const spy = jest.spyOn(api, 'getItems').mockResolvedValue(mockData);

      const res = await watchlistService.getWatchlist('ready');
      expect(spy).toHaveBeenCalledWith('ready');
      expect(res).toEqual(mockData);
    });

    test('addItem deve delegar para api.addItem', async () => {
      const mockResult = { success: true, item: { id: 'tt1234', name: 'Movie' } as any };
      const spy = jest.spyOn(api, 'addItem').mockResolvedValue(mockResult);

      const res = await watchlistService.addItem('tt1234', 'movie');
      expect(spy).toHaveBeenCalledWith('tt1234', 'movie');
      expect(res).toEqual(mockResult);
    });

    test('removeItem deve delegar para api.deleteItem', async () => {
      const mockResult = { success: true, stats: {} as any };
      const spy = jest.spyOn(api, 'deleteItem').mockResolvedValue(mockResult);

      const res = await watchlistService.removeItem('tt1234');
      expect(spy).toHaveBeenCalledWith('tt1234');
      expect(res).toEqual(mockResult);
    });

    test('setWatched deve delegar para api.setWatched', async () => {
      const mockResult = { success: true, item: {} as any, stats: {} as any };
      const spy = jest.spyOn(api, 'setWatched').mockResolvedValue(mockResult);

      const res = await watchlistService.setWatched('tt1234', true);
      expect(spy).toHaveBeenCalledWith('tt1234', true);
      expect(res).toEqual(mockResult);
    });

    test('setItemMinQuality deve delegar para api.setItemMinQuality', async () => {
      const mockResult = { success: true, item: {} as any, stats: {} as any };
      const spy = jest.spyOn(api, 'setItemMinQuality').mockResolvedValue(mockResult);

      const res = await watchlistService.setItemMinQuality('tt1234', '4k');
      expect(spy).toHaveBeenCalledWith('tt1234', '4k');
      expect(res).toEqual(mockResult);
    });

    test('syncWatchedFromStremio deve delegar para api.syncWatchedFromStremio', async () => {
      const mockResult = {
        success: true,
        result: { count: 1, newlyMarked: 1, newlyAdded: 0, totalWatched: 1 },
        items: [],
        stats: {} as any,
      };
      const spy = jest.spyOn(api, 'syncWatchedFromStremio').mockResolvedValue(mockResult);

      const res = await watchlistService.syncWatchedFromStremio();
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual(mockResult);
    });

    test('recheckItem deve delegar para api.recheckSingle', async () => {
      const mockResult = { success: true, item: {} as any, becameReady: true };
      const spy = jest.spyOn(api, 'recheckSingle').mockResolvedValue(mockResult);

      const res = await watchlistService.recheckItem('tt1234');
      expect(spy).toHaveBeenCalledWith('tt1234');
      expect(res).toEqual(mockResult);
    });

    test('recheckAll deve delegar para api.recheckAll', async () => {
      const mockResult = { success: true, checkedCount: 5, newlyReady: 2, stats: {} as any };
      const spy = jest.spyOn(api, 'recheckAll').mockResolvedValue(mockResult);

      const res = await watchlistService.recheckAll(true);
      expect(spy).toHaveBeenCalledWith(true);
      expect(res).toEqual(mockResult);
    });

    test('exportBackup deve delegar para api.exportBackup', async () => {
      const mockResult = [{ id: 'tt1', name: 'Movie 1' }] as any;
      const spy = jest.spyOn(api, 'exportBackup').mockResolvedValue(mockResult);

      const res = await watchlistService.exportBackup();
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual(mockResult);
    });

    test('importBackup deve delegar para api.importBackup', async () => {
      const mockResult = { success: true, addedCount: 3, stats: {} as any };
      const spy = jest.spyOn(api, 'importBackup').mockResolvedValue(mockResult);

      const items = [{ id: 'tt1' }, { id: 'tt2' }] as any;
      const res = await watchlistService.importBackup(items);
      expect(spy).toHaveBeenCalledWith(items);
      expect(res).toEqual(mockResult);
    });
  });

  describe('listas personalizadas (custom lists)', () => {
    test('getCustomLists deve delegar para api.getCustomLists', async () => {
      const mockResult = { success: true, lists: [] };
      const spy = jest.spyOn(api, 'getCustomLists').mockResolvedValue(mockResult);

      const res = await watchlistService.getCustomLists();
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual(mockResult);
    });

    test('createCustomList deve delegar para api.createCustomList', async () => {
      const mockResult = { success: true, list: { id: 'l1', name: 'Favoritos', emoji: '⭐' } as any };
      const spy = jest.spyOn(api, 'createCustomList').mockResolvedValue(mockResult);

      const res = await watchlistService.createCustomList('Favoritos', '⭐');
      expect(spy).toHaveBeenCalledWith('Favoritos', '⭐');
      expect(res).toEqual(mockResult);
    });

    test('updateCustomList deve delegar para api.updateCustomList', async () => {
      const mockResult = { success: true, list: { id: 'l1', name: 'Favoritos 2' } as any };
      const spy = jest.spyOn(api, 'updateCustomList').mockResolvedValue(mockResult);

      const res = await watchlistService.updateCustomList('l1', 'Favoritos 2', '🔥');
      expect(spy).toHaveBeenCalledWith('l1', 'Favoritos 2', '🔥');
      expect(res).toEqual(mockResult);
    });

    test('deleteCustomList deve delegar para api.deleteCustomList', async () => {
      const mockResult = { success: true };
      const spy = jest.spyOn(api, 'deleteCustomList').mockResolvedValue(mockResult);

      const res = await watchlistService.deleteCustomList('l1');
      expect(spy).toHaveBeenCalledWith('l1');
      expect(res).toEqual(mockResult);
    });

    test('setItemCustomLists deve delegar para api.setItemCustomLists', async () => {
      const mockResult = { success: true, item: {} as any };
      const spy = jest.spyOn(api, 'setItemCustomLists').mockResolvedValue(mockResult);

      const res = await watchlistService.setItemCustomLists('tt1234', ['l1', 'l2']);
      expect(spy).toHaveBeenCalledWith('tt1234', ['l1', 'l2']);
      expect(res).toEqual(mockResult);
    });
  });
});
