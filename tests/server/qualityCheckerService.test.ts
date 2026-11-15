import {
  isCamStream,
  hasCleanSource,
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

