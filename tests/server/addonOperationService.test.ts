const { addonOperationService } = require('../../server/services');
const { watchlistRepository, analyticsRepository } = require('../../server/repositories');

describe('addonOperationService Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parseCatalogExtra parses URL-encoded extra segments and strips .json suffix', () => {
    expect(addonOperationService.parseCatalogExtra(undefined)).toEqual({});
    expect(addonOperationService.parseCatalogExtra('skip=100.json')).toEqual({ skip: '100' });
    expect(
      addonOperationService.parseCatalogExtra('skip=20&genre=Sci-Fi%20%26%20Fantasy.json')
    ).toEqual({
      skip: '20',
      genre: 'Sci-Fi & Fantasy',
    });
  });

  test('hydrateUserWatchlistIfEmpty populates repository from userData.items when user watchlist is empty', async () => {
    jest.spyOn(watchlistRepository, 'getItems').mockReturnValue([]);
    jest.spyOn(watchlistRepository, 'getItem').mockReturnValue(null);
    const addSpy = jest.spyOn(watchlistRepository, 'addItem').mockReturnValue({} as any);

    await addonOperationService.hydrateUserWatchlistIfEmpty({
      userId: 'u_test_1',
      userData: {
        items: [{ id: 'tt1234567', name: 'Test Movie', type: 'movie' }],
      },
      authKey: null,
    });

    expect(addSpy).toHaveBeenCalledWith(
      { id: 'tt1234567', name: 'Test Movie', type: 'movie' },
      'u_test_1'
    );
  });

  test('generateQrCode returns PNG buffer by default and SVG string when format=svg', async () => {
    const pngResult = await addonOperationService.generateQrCode({
      text: 'https://stremiowatchlist.vercel.app',
      format: 'png',
      size: 250,
    });
    expect(pngResult.contentType).toBe('image/png');
    expect(Buffer.isBuffer(pngResult.payload)).toBe(true);

    const svgResult = await addonOperationService.generateQrCode({
      text: 'https://stremiowatchlist.vercel.app',
      format: 'svg',
    });
    expect(svgResult.contentType).toBe('image/svg+xml');
    expect(svgResult.payload).toContain('<svg');
  });

  test('recordQrScanAndGetRedirectUrl logs analytics event and returns redirect target URL', () => {
    const recordSpy = jest
      .spyOn(analyticsRepository, 'recordAnalyticsEvent')
      .mockResolvedValue({} as any);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const redirectUrl = addonOperationService.recordQrScanAndGetRedirectUrl({
      baseUrl: 'https://stremiowatchlist.vercel.app',
      context: 'stremio_tv',
      userAgent: 'TestAgent/1.0',
      ip: '127.0.0.1',
    });

    expect(redirectUrl).toBe(
      'https://stremiowatchlist.vercel.app/?source=stremio_tv_qr&context=stremio_tv'
    );
    expect(recordSpy).toHaveBeenCalledWith('qr_code_scanned', {
      source: 'stremio_tv_qr',
      context: 'stremio_tv',
      ip: '127.0.0.1',
      userAgent: 'TestAgent/1.0',
    });
    logSpy.mockRestore();
  });

  test('generateQrPosterSvg embeds QR code data URL into clean scannable SVG poster', async () => {
    const svg = await addonOperationService.generateQrPosterSvg({
      baseUrl: 'https://stremiowatchlist.vercel.app',
      context: 'stremio_tv',
    });

    expect(svg).toContain('<svg width="500" height="750"');
    expect(svg).toContain('SCAN QR CODE');
    expect(svg).toContain('data:image/png;base64,');
    expect(svg).not.toContain('stremiowatchlist.vercel.app');
    expect(svg).not.toContain('Good Quality Tracker');
    expect(svg).not.toContain('Empty Watchlist');
  });
});
