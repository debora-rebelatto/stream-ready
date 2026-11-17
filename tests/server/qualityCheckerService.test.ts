import {
  isCamStream,
  hasCleanSource,
  isStreamMatchingYear,
  extractStreamYears,
  parseStreams,
  checkMovieQuality,
  qualityCheckerService
} from '../../server/services/qualityCheckerService.ts';

describe('Backend QualityCheckerService (server/services/qualityCheckerService.ts)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('isCamStream', () => {
    test('deve identificar tags de gravação de cinema (CAM/TS/SCR)', () => {
      expect(isCamStream('Deadpool 2024 1080p CAMRip x264')).toBe(true);
      expect(isCamStream('Avatar 2 HDTS x264 Clean Audio')).toBe(true);
      expect(isCamStream('Gladiator II 2024 TELESYNC NEW AUDIO')).toBe(true);
      expect(isCamStream('Wicked 2024 HQMIC 720p')).toBe(true);
      expect(isCamStream('Clayface.(2026).(HQ-NoADS-NoLogo).1080p.10bit.x265.LD-AAC5.1.ITA.LD-AAC2.0.ENG.MTRx')).toBe(true);
      expect(isCamStream('Movie 2026 HDCINE 1080p MD-AAC')).toBe(true);
    });

    test('deve retornar falso para releases digitais limpos', () => {
      expect(isCamStream('Inception.2010.1080p.BluRay.x264.DTS-HD')).toBe(false);
      expect(isCamStream('Dune.Part.Two.2024.2160p.WEB-DL.DDP5.1.Atmos')).toBe(false);
    });
  });

  describe('hasCleanSource', () => {
    test('deve identificar formatos digitais/físicos confirmados', () => {
      expect(hasCleanSource('Movie.2024.1080p.WEB-DL.DDP5.1')).toBe(true);
      expect(hasCleanSource('Movie.2024.2160p.BluRay.REMUX')).toBe(true);
      expect(hasCleanSource('Movie.2024.AMZN.WEB-DL.x264')).toBe(true);
    });
  });

  describe('isStreamMatchingYear', () => {
    test('deve aceitar streams do mesmo ano ou com margem de 1 ano', () => {
      expect(isStreamMatchingYear('Dune.Part.Two.2024.1080p.WEB-DL', '2024')).toBe(true);
      expect(isStreamMatchingYear('Movie.Title.2023.1080p.WEB-DL', 2024)).toBe(true);
      expect(isStreamMatchingYear('Blade.Runner.2049.2017.1080p.BluRay', 2017)).toBe(true);
    });

    test('deve rejeitar streams de filmes homônimos antigos ou torrents falsos com ano discrepante', () => {
      expect(isStreamMatchingYear('How to Rob a Bank 2007 1080p AMZN WEB-DL', 2026)).toBe(false);
      expect(isStreamMatchingYear('Old.Film.1998.720p.HDTV', 2024)).toBe(false);
    });
  });

  describe('parseStreams', () => {
    test('deve retornar Unreleased quando não houver streams', () => {
      const res = parseStreams([]);
      expect(res.isUnreleased).toBe(true);
      expect(res.isReady).toBe(false);
      expect(res.bestQuality).toBe('Unreleased');
    });

    test('deve marcar como isCamOnly quando só existirem streams de cinema', () => {
      const streams = [
        { name: 'Torrentio', title: 'Movie 2024 HDCAM 1080p' },
        { name: 'Torrentio', title: 'Movie 2024 TELESYNC HQMIC' }
      ];
      const res = parseStreams(streams);
      expect(res.isCamOnly).toBe(true);
      expect(res.isReady).toBe(false);
      expect(res.bestQuality).toBe('CAM / Theater Rip');
    });

    test('deve priorizar stream 4K limpo', () => {
      const streams = [
        { name: 'Torrentio', title: 'Movie 2024 2160p WEB-DL DDP5.1 Atmos HDR' },
        { name: 'Torrentio', title: 'Movie 2024 1080p BluRay' }
      ];
      const res = parseStreams(streams);
      expect(res.isReady).toBe(true);
      expect(res.bestQuality).toBe('4K UHD');
      expect(res.cleanStreamCount).toBe(2);
    });

    test('deve priorizar stream 1080p quando não houver 4K', () => {
      const streams = [
        { name: 'Torrentio', title: 'Movie 2024 1080p WEB-DL DDP5.1' }
      ];
      const res = parseStreams(streams);
      expect(res.isReady).toBe(true);
      expect(res.bestQuality).toBe('1080p FHD');
    });

    test('deve rejeitar torrent falso sem fonte oficial cercado por streams CAM (ex: Godzilla Minus Zero)', () => {
      const streams = [
        {
          name: 'Torrentio\n1080p',
          title: 'Godzilla Minus Zero 2026 1080p HD h264- ETHEL\n👤 1373 💾 1.2 GB ⚙️ 1337x'
        },
        {
          name: 'Torrentio\n1080p',
          title: 'Godzilla Minus Zero 2026 1080p HD h264- ETHEL\n👤 172 💾 1.8 GB ⚙️ 1337x'
        },
        {
          name: 'Torrentio\nCAM',
          title: 'Godzilla.Minus.Zero.2026.1080p.CAMRip.Dublado.mkv\n👤 274 💾 3.83 GB'
        },
        {
          name: 'Torrentio\nTeleSync',
          title: 'Godzilla.Minus.Zero.2026.PL.AI.1080p.HDTS.H264-MAXX\n👤 97 💾 2.9 GB'
        },
        {
          name: 'Torrentio\nTeleCine',
          title: 'Godzilla.Minus.Zero.2026.D.TELECINE.1080p\n👤 42 💾 6.53 GB'
        },
        {
          name: 'Torrentio',
          title: 'Godzilla Minus Zero (2026) HdTScr Lat\n👤 215 💾 1.37 GB'
        }
      ];
      const res = parseStreams(streams, 'Godzilla Minus Zero');
      expect(res.isReady).toBe(false);
      expect(res.isCamOnly).toBe(true);
      expect(res.bestQuality).toBe('CAM / Theater Rip');
      expect(res.cleanStreamCount).toBe(0);
    });

    test('deve rejeitar stream falso com tamanho suspeito e/ou isolado com baixa contagem de seeds entre vários CAMs', () => {
      const streams = [
        {
          name: 'Torrentio\n1080p',
          title: 'Clayface.(2026).(HQ-NoADS-NoLogo).1080p.10bit.x265.LD-AAC5.1.ITA.LD-AAC2.0.ENG.MTRx\n👤 64 💾 1.61 GB'
        },
        {
          name: 'Torrentio\n1080p',
          title: 'Clayface (2026) 1080p AMZN WEB-DL DDP5 1 H 264-FLUX\n👤 5 💾 1 GB ⚙️ 1337x'
        },
        {
          name: 'Torrentio\nCAM',
          title: 'Clayface.2026.CAM .1080p.FR.EN-OnlyFlix\n👤 349 💾 4.59 GB'
        },
        {
          name: 'Torrentio\nTeleSync',
          title: 'Clayface.2026.1080p.TELESYNC.DL.x264-CLEANUP\n👤 247 💾 5.2 GB'
        },
        {
          name: 'Torrentio\nCAM',
          title: 'Clayface 2026 1080p CAM x264-OnlyFlix\n👤 38 💾 437.92 MB'
        }
      ];
      const res = parseStreams(streams, 'Clayface');
      expect(res.isReady).toBe(false);
      expect(res.isCamOnly).toBe(true);
      expect(res.bestQuality).toBe('CAM / Theater Rip');
      expect(res.cleanStreamCount).toBe(0);
    });

    test('deve rejeitar streams de filmes homônimos antigos ou upload falso para farmar seed (ex: How to Rob a Bank 2026 vs 2007)', () => {
      const streams = [
        {
          name: 'Torrentio\n1080p',
          title: 'How to Rob a Bank 2007 1080p AMZN WEB-DL H264-GPRS\n👤 111 💾 6.18 GB'
        },
        {
          name: 'Torrentio\n1080p',
          title: 'How to Rob a Bank 2007 1080p AMZN WEB-DL DDP2 0 H 264-GPRS\n👤 6 💾 6.18 GB'
        },
        {
          name: 'Torrentio\nCAM',
          title: 'How.to.Rob.a.Bank.2026.1080p.CAMRip.Dublado.mkv\n👤 65 💾 3.44 GB'
        },
        {
          name: 'Torrentio\nTeleCine',
          title: 'How.to.Rob.a.Bank.2026.D.TELECINE.1080p\n👤 16 💾 5.79 GB'
        },
        {
          name: 'Torrentio\nTeleSync',
          title: 'How.to.Rob.a.Bank.2026.TS.1080p\n👤 13 💾 4.67 GB'
        }
      ];
      const res = parseStreams(streams, 'How to Rob a Bank', 2026);
      expect(res.isReady).toBe(false);
      expect(res.isCamOnly).toBe(true);
      expect(res.bestQuality).toBe('CAM / Theater Rip');
      expect(res.cleanStreamCount).toBe(0);
    });
  });

  describe('checkMovieQuality', () => {
    test('deve consultar a API do Torrentio e retornar análise', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          streams: [
            { name: 'Torrentio', title: 'Movie 1080p BluRay x264' }
          ]
        })
      });

      const res = await checkMovieQuality('tt1234567');
      expect(res.isReady).toBe(true);
      expect(res.bestQuality).toBe('1080p FHD');
    });

    test('deve lidar com 404 como filme ainda não lançado', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });

      const res = await checkMovieQuality('tt0000000');
      expect(res.isUnreleased).toBe(true);
      expect(res.isReady).toBe(false);
    });

    test('deve desconsiderar torrents de outros filmes que não batem com o título do filme', () => {
      const streams = [
        { name: 'Torrentio', title: 'You.Can.See.Everything.2026.AUDIONEW.1080P\n👤 174' },
        { name: 'Torrentio', title: 'Porrada 2026 WEB-DL 1080p x264 DUAL 5.1\n👤 1' },
        { name: 'Torrentio', title: 'You.Can.See.Everything.2026.CAM.720p.EN-OnlyFlix\n👤 1027' }
      ];
      const res = parseStreams(streams, 'You Can See Everything');
      expect(res.isReady).toBe(false);
      expect(res.isCamOnly).toBe(true);
      expect(res.bestQuality).toBe('CAM / Theater Rip');
    });
  });

  test('objeto qualityCheckerService deve exportar as funções', () => {
    expect(typeof qualityCheckerService.checkMovieQuality).toBe('function');
    expect(typeof qualityCheckerService.parseStreams).toBe('function');
    expect(typeof qualityCheckerService.isCamStream).toBe('function');
    expect(typeof qualityCheckerService.hasCleanSource).toBe('function');
  });
});

