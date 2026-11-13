const { parseStreams } = require('../lib/qualityChecker');

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
        title: 'Avatar.The.Way.of.Water.2022.2160p.UHD.BluRay.x265.10bit.DDP5.1.Atmos-FLUX'
      }
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
        title: 'Dune.Part.Two.2024.1080p.WEB-DL.DDP5.1.Atmos.H.264-FLUX'
      }
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
        title: 'Movie.Title.2023.720p.HDTV.x264-PROPER'
      }
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(true);
    expect(result.bestQuality).toBe('720p HD');
  });

  test('deve identificar gravação de cinema (CAM / HDCAM / TS)', () => {
    const streams = [
      {
        name: 'Torrentio\nCAM',
        title: 'New.Blockbuster.2024.HDCAM.x264.CLEANAUDIO-CAM'
      },
      {
        name: 'Torrentio\nTS',
        title: 'New.Blockbuster.2024.TELESYNC.HQMIC-NEW'
      }
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
        title: 'Movie.2024.HDCAM.x264-CAM'
      },
      {
        name: 'Torrentio\n1080p',
        title: 'Movie.2024.1080p.BluRay.x264.DTS-HD-FLUX'
      }
    ];

    const result = parseStreams(streams);
    expect(result.isReady).toBe(true);
    expect(result.has1080pPlus).toBe(true);
    expect(result.bestQuality).toBe('1080p FHD');
    expect(result.cleanStreamCount).toBe(1);
  });
});
