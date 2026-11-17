import {
  getCuratedLists,
  getCuratedListById,
  addCuratedListToUser,
  loadCuratedListsData,
} from '../../server/services/curatedListsService.ts';

describe('CuratedListsService (server/services/curatedListsService.ts)', () => {
  test('should load curated lists data containing streaming platforms', () => {
    const data = loadCuratedListsData();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(5);

    const netflix = data.find((l) => l.id === 'new_netflix');
    expect(netflix).toBeDefined();
    expect(netflix?.name).toBe('New on Netflix');
    expect(netflix?.platform).toBe('Netflix');
    expect(netflix?.items.length).toBeGreaterThan(0);

    const disney = data.find((l) => l.id === 'new_disney');
    expect(disney).toBeDefined();
    expect(disney?.name).toBe('New on Disney+');

    const hbo = data.find((l) => l.id === 'new_hbo_max');
    expect(hbo).toBeDefined();
    expect(hbo?.name).toBe('New on HBO Max');
  });

  test('getCuratedLists should mark isAdded based on userCustomLists', () => {
    const userLists = [{ id: 'list_1', name: 'New on Netflix', emoji: '🔴' }];

    const lists = getCuratedLists(userLists);
    const netflix = lists.find((l) => l.id === 'new_netflix');
    const disney = lists.find((l) => l.id === 'new_disney');

    expect(netflix?.isAdded).toBe(true);
    expect(disney?.isAdded).toBe(false);
  });

  test('getCuratedListById should return correct list or null', () => {
    const list = getCuratedListById('new_disney');
    expect(list).not.toBeNull();
    expect(list?.name).toBe('New on Disney+');

    const invalid = getCuratedListById('non_existent');
    expect(invalid).toBeNull();
  });

  test('addCuratedListToUser should throw if userId is empty', async () => {
    await expect(addCuratedListToUser('', 'new_netflix', {})).rejects.toThrow(
      'User identifier is required'
    );
  });

  test('addCuratedListToUser should throw if listId is unknown', async () => {
    await expect(addCuratedListToUser('user123', 'invalid_id', {})).rejects.toThrow(/not found/i);
  });

  test('addCuratedListToUser should create list and add movies to mock db', async () => {
    const mockCreatedList = {
      id: 'custom_netflix_1',
      name: 'New on Netflix',
      emoji: '🔴',
      itemsCount: 0,
    };

    const mockDbItems: any[] = [];
    const mockDbLists: any[] = [];

    const mockDb = {
      getCustomLists: jest.fn().mockReturnValue(mockDbLists),
      createCustomList: jest.fn().mockImplementation((userId, data) => {
        const created = { id: 'custom_list_123', userId, ...data };
        mockDbLists.push(created);
        return Promise.resolve(created);
      }),
      getItem: jest.fn().mockImplementation((id, userId) => {
        return mockDbItems.find((i) => i.id === id);
      }),
      addItem: jest.fn().mockImplementation((item, userId) => {
        mockDbItems.push(item);
        return Promise.resolve(item);
      }),
      updateItem: jest.fn().mockImplementation((id, updates, userId) => {
        const idx = mockDbItems.findIndex((i) => i.id === id);
        if (idx !== -1) {
          mockDbItems[idx] = { ...mockDbItems[idx], ...updates };
        }
        return Promise.resolve(mockDbItems[idx]);
      }),
    };

    const mockQualityChecker = jest.fn().mockResolvedValue({
      has1080pPlus: true,
      bestQuality: '1080p Web-DL',
      streamCount: 5,
      checkedAt: new Date().toISOString(),
    });

    const result = await addCuratedListToUser(
      'user_test_1',
      'new_netflix',
      mockDb,
      mockQualityChecker
    );

    expect(result.success).toBe(true);
    expect(result.addedMoviesCount).toBeGreaterThan(0);
    expect(mockDb.createCustomList).toHaveBeenCalled();
    expect(mockDb.addItem).toHaveBeenCalled();
    expect(mockDbItems.length).toBe(result.addedMoviesCount);

    // Verify all added items have customLists containing custom_list_123
    for (const item of mockDbItems) {
      expect(item.customLists).toContain('custom_list_123');
    }
  });

  test('addCuratedListToUser should merge into existing items and not duplicate', async () => {
    const netflixList = getCuratedListById('new_netflix')!;
    const existingMovieId = netflixList.items[0].id;
    const mockDbItems: any[] = [
      {
        id: existingMovieId,
        name: netflixList.items[0].name,
        customLists: ['other_list_1'],
      },
    ];

    const mockDb = {
      getCustomLists: jest
        .fn()
        .mockReturnValue([{ id: 'list_netflix_existing', name: 'New on Netflix', emoji: '🔴' }]),
      createCustomList: jest.fn(),
      getItem: jest.fn().mockImplementation((id) => mockDbItems.find((i) => i.id === id)),
      addItem: jest.fn().mockImplementation((item) => {
        mockDbItems.push(item);
        return Promise.resolve(item);
      }),
      updateItem: jest.fn().mockImplementation((id, updates) => {
        const item = mockDbItems.find((i) => i.id === id);
        if (item) Object.assign(item, updates);
        return Promise.resolve(item);
      }),
    };

    const result = await addCuratedListToUser('user_test_2', 'new_netflix', mockDb);
    expect(result.success).toBe(true);
    expect(result.existingMoviesCount).toBe(1);
    expect(mockDb.createCustomList).not.toHaveBeenCalled(); // Should reuse existing list

    const updatedMovie = mockDbItems.find((i) => i.id === existingMovieId);
    expect(updatedMovie.customLists).toContain('list_netflix_existing');
    expect(updatedMovie.customLists).toContain('other_list_1');
  });
});
