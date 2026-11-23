import { extractAudioInfo, parseStreams } from '../server/services/qualityCheckerService';
import {
  isItemReady,
  computeMovieStatus,
  filterWatchlistItems,
} from '../src/utils';
import type { WatchlistItem } from '../src/models';

describe('Audio Format Detection & Filtering', () => {
  describe('Backend extractAudioInfo', () => {
    test('detects Dolby Atmos (DDP5.1.Atmos, TrueHD.Atmos, Atmos)', () => {
      const ddpAtmos = extractAudioInfo('Dune.Part.Two.2024.1080p.WEB-DL.DDP5.1.Atmos.H.264');
      expect(ddpAtmos.hasAtmos).toBe(true);
      expect(ddpAtmos.hasSurround).toBe(true);
      expect(ddpAtmos.audioFormat).toBe('Dolby Atmos');

      const truehdAtmos = extractAudioInfo('Avatar.2022.2160p.UHD.BluRay.TrueHD.7.1.Atmos-FLUX');
      expect(truehdAtmos.hasAtmos).toBe(true);
      expect(truehdAtmos.audioFormat).toBe('Dolby Atmos');
    });

    test('detects TrueHD, DTS-HD MA, DTS:X, FLAC, DDP 5.1, DTS 5.1, and 5.1 Surround', () => {
      expect(extractAudioInfo('Movie.2024.2160p.REMUX.TrueHD.7.1').audioFormat).toBe('TrueHD 7.1');
      expect(extractAudioInfo('Movie.2024.1080p.BluRay.DTS-HD.MA.5.1').audioFormat).toBe('DTS-HD MA');
      expect(extractAudioInfo('Movie.2024.2160p.BluRay.DTS-X').audioFormat).toBe('DTS:X');
      expect(extractAudioInfo('Movie.2024.1080p.BluRay.FLAC.5.1').audioFormat).toBe('FLAC 5.1');
      expect(extractAudioInfo('Movie.2024.1080p.WEB-DL.DDP5.1').audioFormat).toBe('DDP 5.1');
      expect(extractAudioInfo('Movie.2024.1080p.BluRay.DTS').audioFormat).toBe('DTS 5.1');
      expect(extractAudioInfo('Movie.2024.1080p.WEB-DL.AC3.5.1').audioFormat).toBe('5.1 Surround');
    });

    test('returns empty audioFormat for plain stereo or unlabeled releases', () => {
      const stereo = extractAudioInfo('Movie.2024.1080p.WEB-DL.AAC2.0.x264');
      expect(stereo.hasAtmos).toBe(false);
      expect(stereo.hasSurround).toBe(false);
      expect(stereo.audioFormat).toBe('');
    });
  });

  describe('Backend parseStreams audio aggregation', () => {
    test('selects highest-tier audio format across clean streams', () => {
      const res = parseStreams([
        { name: 'Torrentio', title: 'Movie 2024 1080p WEB-DL DDP5.1' },
        { name: 'Torrentio', title: 'Movie 2024 2160p UHD BluRay TrueHD 7.1 Atmos' },
      ]);
      expect(res.isReady).toBe(true);
      expect(res.hasAtmos).toBe(true);
      expect(res.hasSurround).toBe(true);
      expect(res.audioFormat).toBe('Dolby Atmos');
    });

    test('ignores audio metadata from CAM streams', () => {
      const res = parseStreams([
        { name: 'Torrentio', title: 'Movie 2024 HDCAM Atmos 5.1' },
      ]);
      expect(res.isReady).toBe(false);
      expect(res.hasAtmos).toBe(false);
      expect(res.audioFormat).toBe('');
    });
  });

  describe('Frontend qualityAdapter & watchlistFilter audio rules (backend-provided flags)', () => {
    const atmosMovie: WatchlistItem = {
      id: 'tt1000001',
      type: 'movie',
      name: 'Dune: Part Two',
      year: '2024',
      has1080pPlus: true,
      bestQuality: '4K UHD',
      hasAtmos: true,
      hasSurround: true,
      isLosslessAudio: false,
      audioFormat: 'Dolby Atmos',
      streamCount: 25,
    };

    const losslessMovie: WatchlistItem = {
      id: 'tt1000002',
      type: 'movie',
      name: 'Lossless Movie',
      year: '2024',
      has1080pPlus: true,
      bestQuality: '1080p FHD',
      hasAtmos: false,
      hasSurround: true,
      isLosslessAudio: true,
      audioFormat: 'TrueHD 7.1',
      streamCount: 12,
    };

    const stereoMovie: WatchlistItem = {
      id: 'tt1000003',
      type: 'movie',
      name: 'Stereo Movie',
      year: '2024',
      has1080pPlus: true,
      bestQuality: '1080p FHD',
      hasAtmos: false,
      hasSurround: false,
      isLosslessAudio: false,
      audioFormat: '',
      streamCount: 5,
    };

    test('evaluates isItemReady respecting minAudio preference', () => {
      expect(isItemReady(stereoMovie, '1080p', 'any')).toBe(true);
      expect(isItemReady(stereoMovie, '1080p', 'surround')).toBe(false);
      expect(isItemReady(losslessMovie, '1080p', 'surround')).toBe(true);
      expect(isItemReady(losslessMovie, '1080p', 'atmos')).toBe(false);
      expect(isItemReady(atmosMovie, '4k', 'atmos')).toBe(true);
    });

    test('computes movie status with backend audio flags', () => {
      const status = computeMovieStatus(atmosMovie, '4k', 'atmos');
      expect(status.isReady).toBe(true);
      expect(status.hasAtmos).toBe(true);
      expect(status.hasSurround).toBe(true);
      expect(status.audioFormat).toBe('Dolby Atmos');
      expect(status.activeTargetAudio).toBe('atmos');
    });

    test('filters watchlist items by selectedAudio using backend flags', () => {
      const all = [atmosMovie, losslessMovie, stereoMovie];
      const baseCriteria = {
        currentTab: 'all' as const,
        activeCustomListId: null,
        selectedQuality: 'all',
        includeWatchedInAll: true,
        searchQuery: '',
        globalMinQuality: '1080p' as const,
        globalMinAudio: 'any' as const,
      };

      expect(filterWatchlistItems(all, { ...baseCriteria, selectedAudio: 'atmos' }).map((m) => m.id)).toEqual([
        'tt1000001',
      ]);
      expect(filterWatchlistItems(all, { ...baseCriteria, selectedAudio: 'lossless' }).map((m) => m.id)).toEqual([
        'tt1000002',
      ]);
      expect(filterWatchlistItems(all, { ...baseCriteria, selectedAudio: 'surround' }).map((m) => m.id)).toEqual([
        'tt1000001',
        'tt1000002',
      ]);
      expect(filterWatchlistItems(all, { ...baseCriteria, selectedAudio: 'all' })).toHaveLength(3);
    });
  });
});
