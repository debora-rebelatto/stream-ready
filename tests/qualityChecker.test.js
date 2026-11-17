const { parseStreams, checkMovieQuality } = require('../lib/qualityChecker');

describe('QualityChecker - parseStreams', () => {
  test('deve marcar como Unreleased quando não houver streams', () => {
    const result = parseStreams([]);
    expect(result.isUnreleased).toBe(true);
    expect(result.isReady).toBe(false);
    expect(result.bestQuality).toBe('Unreleased');
    expect(result.streamCount).toBe(0);
    expect(result.cleanStreamCount).toBe(0);
  });

  test('deve detectar stream 4K UHD com fonte limpa', () => {
    const streams = [
      {
        name: 'Torrentio\n4k',
        title: 'Avatar.The.Way.of.Water.2022.2160p.UHD.BluRay.x265.10bit.DDP5.1.Atmos-FLUX',
      },
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(true);
    expect(result.has1080pPlus).toBe(true);
    expect(result.bestQuality).toBe('4K UHD');
    expect(result.cleanStreamCount).toBe(1);
    expect(result.isCamOnly).toBe(false);
  });

  test('deve detectar stream 1080p FHD com fonte WEB-DL', () => {
    const streams = [
      {
        name: 'Torrentio\n1080p',
        title: 'Dune.Part.Two.2024.1080p.WEB-DL.DDP5.1.Atmos.H.264-FLUX',
      },
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(true);
    expect(result.has1080pPlus).toBe(true);
    expect(result.bestQuality).toBe('1080p FHD');
    expect(result.cleanStreamCount).toBe(1);
  });

  test('deve detectar stream 720p HD', () => {
    const streams = [
      {
        name: 'Torrentio\n720p',
        title: 'Movie.Title.2023.720p.HDTV.x264-PROPER',
      },
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(true);
    expect(result.bestQuality).toBe('720p HD');
  });

  test('deve detectar stream limpa sem resolução explícita como Digital (WEB/SD)', () => {
    const streams = [
      {
        name: 'Torrentio\nOther',
        title: 'Classic.Film.1995.DVDRip.AAC2.0.x264',
      },
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(true);
    expect(result.bestQuality).toBe('Digital (WEB/SD)');
    expect(result.cleanStreamCount).toBe(1);
  });

  test('deve identificar gravação de cinema (CAM / HDCAM / TS)', () => {
    const streams = [
      {
        name: 'Torrentio\nCAM',
        title: 'New.Blockbuster.2024.HDCAM.x264.CLEANAUDIO-CAM',
      },
      {
        name: 'Torrentio\nTS',
        title: 'New.Blockbuster.2024.TELESYNC.HQMIC-NEW',
      },
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(false);
    expect(result.isCamOnly).toBe(true);
    expect(result.bestQuality).toBe('CAM / Theater Rip');
    expect(result.cleanStreamCount).toBe(0);
  });

  test('deve filtrar streams CAM quando houver streams limpos disponíveis', () => {
    const streams = [
      {
        name: 'Torrentio\nCAM',
        title: 'Movie.2024.HDCAM.x264-CAM',
      },
      {
        name: 'Torrentio\n1080p',
        title: 'Movie.2024.1080p.BluRay.x264.DTS-HD-FLUX',
      },
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(true);
    expect(result.has1080pPlus).toBe(true);
    expect(result.bestQuality).toBe('1080p FHD');
    expect(result.cleanStreamCount).toBe(1);
  });

  test('deve rejeitar torrent falso sem fonte digital oficial cercado por streams CAM (ex: Godzilla Minus Zero)', () => {
    const streams = [
      {
        name: 'Torrentio\n1080p',
        title: 'Godzilla Minus Zero 2026 1080p HD h264- ETHEL\n👤 1373 💾 1.2 GB ⚙️ 1337x',
      },
      {
        name: 'Torrentio\n1080p',
        title: 'Godzilla Minus Zero 2026 1080p HD h264- ETHEL\n👤 172 💾 1.8 GB ⚙️ 1337x',
      },
      {
        name: 'Torrentio\nCAM',
        title: 'Godzilla.Minus.Zero.2026.1080p.CAMRip.Dublado.mkv\n👤 274 💾 3.83 GB',
      },
      {
        name: 'Torrentio\nTeleSync',
        title: 'Godzilla.Minus.Zero.2026.PL.AI.1080p.HDTS.H264-MAXX\n👤 97 💾 2.9 GB',
      },
      {
        name: 'Torrentio\nTeleCine',
        title: 'Godzilla.Minus.Zero.2026.D.TELECINE.1080p\n👤 42 💾 6.53 GB',
      },
      {
        name: 'Torrentio',
        title: 'Godzilla Minus Zero (2026) HdTScr Lat\n👤 215 💾 1.37 GB',
      },
    ];

    const result = parseStreams(streams, 'Godzilla Minus Zero');
    expect(result.isReady).toBe(false);
    expect(result.isCamOnly).toBe(true);
    expect(result.bestQuality).toBe('CAM / Theater Rip');
    expect(result.cleanStreamCount).toBe(0);
  });

  test('deve rejeitar streams de filmes antigos homônimos ou upload falso para farmar seed (ex: How to Rob a Bank 2026 vs 2007)', () => {
    const streams = [
      {
        name: 'Torrentio\n1080p',
        title: 'How to Rob a Bank 2007 1080p AMZN WEB-DL H264-GPRS\n👤 111 💾 6.18 GB',
      },
      {
        name: 'Torrentio\n1080p',
        title: 'How to Rob a Bank 2007 1080p AMZN WEB-DL DDP2 0 H 264-GPRS\n👤 6 💾 6.18 GB',
      },
      {
        name: 'Torrentio\nCAM',
        title: 'How.to.Rob.a.Bank.2026.1080p.CAMRip.Dublado.mkv\n👤 65 💾 3.44 GB',
      },
      {
        name: 'Torrentio\nTeleCine',
        title: 'How.to.Rob.a.Bank.2026.D.TELECINE.1080p\n👤 16 💾 5.79 GB',
      },
      {
        name: 'Torrentio\nTeleSync',
        title: 'How.to.Rob.a.Bank.2026.TS.1080p\n👤 13 💾 4.67 GB',
      },
    ];

    const result = parseStreams(streams, 'How to Rob a Bank', '2026');
    expect(result.isReady).toBe(false);
    expect(result.isCamOnly).toBe(true);
    expect(result.bestQuality).toBe('CAM / Theater Rip');
    expect(result.cleanStreamCount).toBe(0);
  });
});

describe('QualityChecker - checkMovieQuality', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('deve consultar Torrentio e retornar parse dos streams quando resposta for OK', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        streams: [
          {
            name: 'Torrentio\n1080p',
            title: 'Test.Movie.2024.1080p.WEB-DL.DDP5.1',
          },
        ],
      }),
    });

    const result = await checkMovieQuality('tt1234567');
    expect(result.isReady).toBe(true);
    expect(result.bestQuality).toBe('1080p FHD');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/stream/movie/tt1234567.json'),
      expect.any(Object)
    );
  });

  test('deve retornar Unreleased quando Torrentio responder com 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const result = await checkMovieQuality('tt0000000');
    expect(result.isUnreleased).toBe(true);
    expect(result.bestQuality).toBe('Unreleased');
    expect(result.has1080pPlus).toBe(false);
  });

  test('deve retornar Check Error quando Torrentio responder com erro de status (ex: 500)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await checkMovieQuality('tt1234567');
    expect(result.bestQuality).toBe('Check Error');
    expect(result.error).toContain('Torrentio responded with status 500');
    expect(result.has1080pPlus).toBe(false);
    warnSpy.mockRestore();
  });

  test('deve retornar Check Error quando fetch falhar por timeout ou erro de rede', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await checkMovieQuality('tt1234567');
    expect(result.bestQuality).toBe('Check Error');
    expect(result.error).toBe('Network error');
    warnSpy.mockRestore();
  });
});
