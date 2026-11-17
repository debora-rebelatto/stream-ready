import {
  authService,
  watchlistService,
  customListService,
  pollService,
  systemService,
  cinemetaService,
} from '../../src/services';
import { api } from '../../src/lib/api';

describe('Frontend Services Layer', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('services index barrel exports', () => {
    test('should export all domain services properly', () => {
      expect(authService).toBeDefined();
      expect(watchlistService).toBeDefined();
      expect(customListService).toBeDefined();
      expect(pollService).toBeDefined();
      expect(systemService).toBeDefined();
      expect(cinemetaService).toBeDefined();
    });
  });

  describe('pollService', () => {
    test('getPollStatus should delegate to api.getPollStatus', async () => {
      const mockResult = { hasVoted: true, vote: { option: 'notifications' } };
      const spy = jest.spyOn(api, 'getPollStatus').mockResolvedValue(mockResult);

      const result = await pollService.getPollStatus();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });

    test('submitPollVote should delegate to api.submitPollVote with parameters', async () => {
      const mockResult = { success: true };
      const spy = jest.spyOn(api, 'submitPollVote').mockResolvedValue(mockResult);

      const result = await pollService.submitPollVote('other', 'Custom suggestion');
      expect(spy).toHaveBeenCalledWith('other', 'Custom suggestion');
      expect(result).toEqual(mockResult);
    });
  });

  describe('systemService', () => {
    test('getInfo should delegate to api.getInfo', async () => {
      const mockInfo = {
        name: 'Stremio Good Quality Tracker',
        version: '1.0.0',
        manifestUrl: 'https://test/manifest.json',
        stremioInstallUrl: 'stremio://test/manifest.json',
        stats: { totalUsers: 10, totalMovies: 50 },
      };
      const spy = jest.spyOn(api, 'getInfo').mockResolvedValue(mockInfo);

      const result = await systemService.getInfo();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockInfo);
    });

    test('getSettings should delegate to api.getSettings', async () => {
      const mockSettings = { minQuality: '1080p' as const, autoSyncWatched: true };
      const spy = jest.spyOn(api, 'getSettings').mockResolvedValue(mockSettings);

      const result = await systemService.getSettings();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockSettings);
    });

    test('saveSettings should delegate to api.saveSettings with partial settings', async () => {
      const mockResponse = { success: true, settings: { minQuality: '4k' as const } };
      const spy = jest.spyOn(api, 'saveSettings').mockResolvedValue(mockResponse);

      const result = await systemService.saveSettings({ minQuality: '4k' });
      expect(spy).toHaveBeenCalledWith({ minQuality: '4k' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('customListService', () => {
    test('getCustomLists should delegate to api.getCustomLists', async () => {
      const mockLists = {
        success: true,
        lists: [{ id: 'l1', name: 'Horror', emoji: '👻', createdAt: '' }],
      };
      const spy = jest.spyOn(api, 'getCustomLists').mockResolvedValue(mockLists);

      const result = await customListService.getCustomLists();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockLists);
    });

    test('createCustomList should delegate to api.createCustomList', async () => {
      const mockRes = {
        success: true,
        list: { id: 'l2', name: 'Sci-Fi', emoji: '🚀', createdAt: '' },
      };
      const spy = jest.spyOn(api, 'createCustomList').mockResolvedValue(mockRes);

      const result = await customListService.createCustomList('Sci-Fi', '🚀');
      expect(spy).toHaveBeenCalledWith('Sci-Fi', '🚀');
      expect(result).toEqual(mockRes);
    });

    test('updateCustomList should delegate to api.updateCustomList', async () => {
      const mockRes = {
        success: true,
        list: { id: 'l2', name: 'Sci-Fi Classic', emoji: '🛸', createdAt: '' },
      };
      const spy = jest.spyOn(api, 'updateCustomList').mockResolvedValue(mockRes);

      const result = await customListService.updateCustomList('l2', 'Sci-Fi Classic', '🛸');
      expect(spy).toHaveBeenCalledWith('l2', 'Sci-Fi Classic', '🛸');
      expect(result).toEqual(mockRes);
    });

    test('deleteCustomList should delegate to api.deleteCustomList', async () => {
      const mockRes = { success: true, deletedItemsCount: 3 };
      const spy = jest.spyOn(api, 'deleteCustomList').mockResolvedValue(mockRes);

      const result = await customListService.deleteCustomList('l2');
      expect(spy).toHaveBeenCalledWith('l2');
      expect(result).toEqual(mockRes);
    });

    test('setItemCustomLists should delegate to api.setItemCustomLists', async () => {
      const mockItem = { id: 'tt1234', name: 'Movie', customLists: ['l1', 'l2'] } as any;
      const mockRes = { success: true, item: mockItem };
      const spy = jest.spyOn(api, 'setItemCustomLists').mockResolvedValue(mockRes);

      const result = await customListService.setItemCustomLists('tt1234', ['l1', 'l2']);
      expect(spy).toHaveBeenCalledWith('tt1234', ['l1', 'l2']);
      expect(result).toEqual(mockRes);
    });

    test('getCuratedLists should delegate to api.getCuratedLists', async () => {
      const mockRes = {
        success: true,
        lists: [{ id: 'curated1', name: 'Netflix', moviesCount: 10 }] as any,
      };
      const spy = jest.spyOn(api, 'getCuratedLists').mockResolvedValue(mockRes);

      const result = await customListService.getCuratedLists();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockRes);
    });

    test('addCuratedList should delegate to api.addCuratedList', async () => {
      const mockRes = { success: true, addedMoviesCount: 5 };
      const spy = jest.spyOn(api, 'addCuratedList').mockResolvedValue(mockRes);

      const result = await customListService.addCuratedList('curated1');
      expect(spy).toHaveBeenCalledWith('curated1');
      expect(result).toEqual(mockRes);
    });
  });
});
