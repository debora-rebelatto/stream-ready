jest.mock('../lib/db', () => ({
  ensureLoaded: jest.fn().mockResolvedValue(true),
  getItems: jest.fn(),
  getItem: jest.fn(),
  getSettings: jest.fn().mockReturnValue({ minQuality: '1080p' }),
  isItemReady: jest.fn((item) => Boolean(item && item.has1080pPlus)),
  isItemUnreleased: jest.fn(() => false),
  getCustomLists: jest.fn((userId) => {
    if (userId === 'user123') {
      return [{ id: 'fav1', name: 'Favoritos', emoji: '⭐' }];
    }
    return [];
  }),
}));

const db = require('../lib/db');
const cinemeta = require('../lib/cinemeta');
const { getManifest, handleCatalog, handleMeta } = require('../lib/stremioAddon');

describe('Stremio Addon Module (lib/stremioAddon.js)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getManifest', () => {
    test('deve retornar manifesto com catálogos padrões', () => {
      const manifest = getManifest('https://myaddon.com');
      expect(manifest.id).toBe('community.watchlist.quality.tracker');
      expect(manifest.logo).toBe('https://myaddon.com/icon.png');
      expect(manifest.catalogs).toHaveLength(3);
    });

    test('deve incluir listas personalizadas quando userId for fornecido', () => {
      const manifest = getManifest('', 'user123');
      expect(manifest.catalogs).toHaveLength(4);
      expect(manifest.catalogs[3].id).toBe('watchlist_custom_fav1');
      expect(manifest.catalogs[3].name).toContain('Favoritos');
    });
  });

  describe('handleCatalog', () => {
    test('deve retornar card de guia se userId não for informado em catálogo principal', async () => {
      const result = await handleCatalog('movie', 'watchlist_ready');
      expect(result.metas).toHaveLength(1);
      expect(result.metas[0].id).toBe('guide_configure');
    });

    test('deve retornar vazio se userId não for informado em catálogo secundário', async () => {
      const result = await handleCatalog('movie', 'watchlist_pending');
      expect(result.metas).toEqual([]);
    });

    test('deve retornar card explicativo quando watchlist do usuário estiver vazia', async () => {
      db.getItems.mockReturnValue([]);
      const result = await handleCatalog('movie', 'watchlist_ready', {}, 'user123');
      expect(result.metas).toHaveLength(1);
      expect(result.metas[0].id).toBe('guide_empty_watchlist');
      expect(result.metas[0].name).toContain('Empty Watchlist');
    });

    test('deve retornar metas filtrados de watchlist_ready', async () => {
      const items = [
        {
          id: 'tt1',
          name: 'Ready Movie',
          has1080pPlus: true,
          bestQuality: '1080p FHD',
          streamCount: 5,
        },
        {
          id: 'tt2',
          name: 'Pending Movie',
          has1080pPlus: false,
          bestQuality: 'Pending',
          streamCount: 0,
        },
      ];
      db.getItems.mockReturnValue(items);

      const result = await handleCatalog('movie', 'watchlist_ready', {}, 'user123');
      expect(result.metas).toHaveLength(1);
      expect(result.metas[0].id).toBe('tt1');
      expect(result.metas[0].name).toContain('Ready Movie');
    });

    test('deve retornar catálogo completo para watchlist_all (ocultando assistidos)', async () => {
      const items = [
        { id: 'tt1', name: 'Movie 1', isWatched: false },
        { id: 'tt2', name: 'Movie 2', isWatched: false },
      ];
      db.getItems.mockReturnValue(items);

      const result = await handleCatalog('movie', 'watchlist_all', {}, 'user123');
      expect(result.metas).toHaveLength(2);
    });

    test('não deve retornar catálogo para watchlist_watched já que foi removido', async () => {
      const items = [
        { id: 'tt1', name: 'Movie 1', isWatched: false },
        { id: 'tt2', name: 'Movie 2', isWatched: true },
      ];
      db.getItems.mockReturnValue(items);

      const result = await handleCatalog('movie', 'watchlist_watched', {}, 'user123');
      expect(result.metas).toHaveLength(0);
    });

    test('deve suportar paginação via extra.skip', async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({
        id: `tt${i}`,
        name: `Movie ${i}`,
        has1080pPlus: true,
      }));
      db.getItems.mockReturnValue(items);

      const result = await handleCatalog('movie', 'watchlist_all', { skip: 10 }, 'user123');
      expect(result.metas).toHaveLength(5);
    });
  });

  describe('handleMeta', () => {
    test('deve retornar meta null se item não for encontrado nem na watchlist nem no Cinemeta', async () => {
      db.getItem.mockReturnValue(null);
      jest.spyOn(cinemeta, 'getMeta').mockResolvedValue(null);

      const res = await handleMeta('movie', 'tt9999', 'user123');
      expect(res).toEqual({ meta: null });
    });

    test('deve enriquecer metadados do Cinemeta com status da watchlist', async () => {
      db.getItem.mockReturnValue({
        id: 'tt1375666',
        name: 'Inception',
        has1080pPlus: true,
        bestQuality: '1080p FHD',
        streamCount: 12,
      });

      jest.spyOn(cinemeta, 'getMeta').mockResolvedValue({
        id: 'tt1375666',
        name: 'Inception',
        year: '2010',
        genres: ['Action'],
        description: 'Original description',
      });

      const res = await handleMeta('movie', 'tt1375666', 'user123');
      expect(res).not.toBeNull();
      expect(res.meta.name).toContain('Inception');
      expect(res.meta.genres).toContain('🟢 Good Quality');
      expect(res.meta.description).toContain('STATUS: AVAILABLE IN GOOD QUALITY!');
    });
  });
});
