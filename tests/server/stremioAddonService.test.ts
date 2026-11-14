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
    test('deve identificar lançamento recente (< 48h)', () => {
      const recent = {
        has1080pPlus: true,
        readyAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
      };
      expect(isItemNewRelease(recent)).toBe(true);
    });

    test('deve retornar falso para lançamentos mais antigos (> 48h)', () => {
      const old = {
        has1080pPlus: true,
        readyAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() // 72 horas atrás
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
      expect(manifest.catalogs.length).toBeGreaterThanOrEqual(4);
      expect(manifest.logo).toBe('http://localhost:7000/icon.png');
    });
  });

  describe('handleCatalog & handleMeta', () => {
    test('deve retornar catálogo vazio se userId for vazio', async () => {
      const res = await handleCatalog('movie', 'watchlist_ready', {}, '');
      expect(res.metas).toEqual([]);
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

