const {
  loadCuratedListsData,
  getCuratedLists,
  getCuratedListById,
  addCuratedListToUser,
} = require('../lib/curatedLists');

describe('CuratedLists CommonJS Module (lib/curatedLists.js)', () => {
  test('should load curated lists data', () => {
    const data = loadCuratedListsData();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(5);

    const ids = data.map((l) => l.id);
    expect(ids).toContain('new_netflix');
    expect(ids).toContain('new_disney');
    expect(ids).toContain('new_hbo_max');
    expect(ids).toContain('new_prime');
    expect(ids).toContain('new_apple');
  });

  test('getCuratedLists correctly formats lists with itemsCount and isAdded', () => {
    const lists = getCuratedLists([{ name: 'New on Disney+', emoji: '🏰' }]);
    const disney = lists.find((l) => l.id === 'new_disney');
    const netflix = lists.find((l) => l.id === 'new_netflix');

    expect(disney.isAdded).toBe(true);
    expect(netflix.isAdded).toBe(false);
    expect(disney.itemsCount).toBeGreaterThan(0);
  });

  test('getCuratedListById finds list by id', () => {
    const hbo = getCuratedListById('new_hbo_max');
    expect(hbo).toBeDefined();
    expect(hbo.name).toBe('New on HBO Max');
    expect(hbo.platform).toBe('HBO Max');
  });

  test('addCuratedListToUser handles mock database additions', async () => {
    const addedItems = [];
    const mockDb = {
      getCustomLists: () => [],
      createCustomList: async (userId, data) => ({ id: 'c_list_1', ...data }),
      getItem: () => null,
      addItem: async (item) => {
        addedItems.push(item);
        return item;
      },
      updateItem: async (id, upd) => ({ id, ...upd }),
    };

    const res = await addCuratedListToUser('user_cjs', 'new_prime', mockDb);
    expect(res.success).toBe(true);
    expect(res.addedMoviesCount).toBeGreaterThan(0);
    expect(addedItems.length).toBe(res.addedMoviesCount);
  });
});
