import {
  getManifest,
  formatQualityLabel,
  isItemNewRelease,
  formatCatalogItem,
  handleCatalog,
  handleMeta,
  stremioAddonService
} from '../../server/services/stremioAddonService.ts';

describe('Backend StremioAddonService (server/services/stremioAddonService.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        meta: { id: 'tt9999999', name: 'Mock Movie', type: 'movie' }
      })
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });
  describe('formatQualityLabel', () => {
    test('deve formatar labels de qualidade corretamente', () => {
      expect(formatQualityLabel(null)).toBe('Pending');
      expect(formatQualityLabel('')).toBe('Pending');
      expect(formatQualityLabel('pendente')).toBe('Pending');
      expect(formatQualityLabel('Ainda não lançado')).toBe('Unreleased');
      expect(formatQualityLabel('Gravação de Cinema')).toBe('CAM / Theater Rip');
      expect(formatQualityLabel('1080p FHD')).toBe('1080p FHD');
      expect(formatQualityLabel('4K UHD')).toBe('4K UHD');
    });
  });

  describe('isItemNewRelease', () => {
    test('deve identificar lançamento recente (< 3 meses)', () => {
      const recent = {
        has1080pPlus: true,
        readyAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
      };
      expect(isItemNewRelease(recent)).toBe(true);
      expect(isItemNewRelease({ ...recent, year: 2026 })).toBe(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(isItemNewRelease({ released: thirtyDaysAgo, has1080pPlus: true })).toBe(true);
    });

    test('deve retornar falso para filmes antigos mesmo com readyAt recente', () => {
      const oldYear = {
        has1080pPlus: true,
        year: '1995',
        readyAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      };
      expect(isItemNewRelease(oldYear)).toBe(false);
    });

    test('deve retornar falso para lançamentos mais antigos (> 3 meses / 90 dias)', () => {
      const old = {
        has1080pPlus: true,
        readyAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 dias atrás
      };
      expect(isItemNewRelease(old)).toBe(false);
    });

    test('deve retornar falso se não estiver pronto', () => {
      expect(isItemNewRelease({ has1080pPlus: false })).toBe(false);
      expect(isItemNewRelease(null)).toBe(false);
    });
  });

  describe('getManifest', () => {
    test('deve retornar a estrutura do manifesto do Stremio', () => {
      const manifest = getManifest('http://localhost:7000');
      expect(manifest.id).toBe('community.watchlist.quality.tracker');
      expect(manifest.name).toBe('Watchlist (Good Quality Tracker)');
      expect(manifest.resources).toContain('catalog');
      expect(manifest.resources).toContain('meta');
      expect(manifest.catalogs.length).toBeGreaterThanOrEqual(3);
      expect(manifest.catalogs.some((c) => c.id === 'watchlist_watched')).toBe(false);
      expect(manifest.logo).toBe('http://localhost:7000/icon.png');
    });
  });

  describe('handleCatalog & handleMeta', () => {
    test('deve retornar card explicativo de configuração se userId for vazio para catálogo principal', async () => {
      const res = await handleCatalog('movie', 'watchlist_ready', {}, '');
      expect(res.metas).toHaveLength(1);
      expect(res.metas[0].id).toBe('guide_configure');
      expect(res.metas[0].name).toContain('Setup Required');
    });

    test('deve retornar catálogo vazio se userId for vazio para catálogos secundários', async () => {
      const res = await handleCatalog('movie', 'watchlist_pending', {}, '');
      expect(res.metas).toEqual([]);
    });

    test('handleMeta deve retornar meta para item de guia de configuração', async () => {
      const res = await handleMeta('movie', 'guide_configure', '');
      expect(res.meta).toBeDefined();
      expect(res.meta?.name).toContain('Setup Required');
    });

    test('handleMeta deve retornar meta para item de guia de watchlist vazia', async () => {
      const res = await handleMeta('movie', 'guide_empty_watchlist', '');
      expect(res.meta).toBeDefined();
      expect(res.meta?.name).toContain('Empty Watchlist');
    });

    test('handleMeta deve retornar meta para item não existente na watchlist', async () => {
      const res = await handleMeta('movie', 'tt9999999', '');
      expect(res).toBeDefined();
    });
  });

  test('objeto stremioAddonService deve exportar as funções', () => {
    expect(typeof stremioAddonService.getManifest).toBe('function');
    expect(typeof stremioAddonService.handleCatalog).toBe('function');
    expect(typeof stremioAddonService.handleMeta).toBe('function');
  });
});

