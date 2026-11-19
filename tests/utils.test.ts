import fs from 'fs';
import path from 'path';
import {
  cn,
  formatQualityLabel,
  isItemReady,
  isItemNewRelease,
  isItemUnreleased,
  resolveMovieStatus,
  parseTimestampMs,
  isTimestampWithinWindow,
  extractReleaseYear,
  isCatalogTitleTooOld,
  evaluateExplicitReleaseDate,
  evaluateReadyTimestampRelease,
  computeMovieStatus,
  enrichWatchlistItem,
} from '../src/lib/utils';
import type { WatchlistItem } from '../src/models';

describe('Frontend Utils (src/lib/utils.ts)', () => {
  describe('cn (Tailwind class merger)', () => {
    test('deve mesclar classes condicionais e resolver conflitos Tailwind', () => {
      const result = cn('px-2 py-1', 'bg-red-500', false && 'hidden', 'px-4');
      expect(result).toBe('py-1 bg-red-500 px-4');
    });
  });

  describe('formatQualityLabel', () => {
    test('deve retornar Pending para valores nulos ou vazios', () => {
      expect(formatQualityLabel()).toBe('Pending');
      expect(formatQualityLabel('')).toBe('Pending');
    });

    test('deve normalizar labels não lançados para Unreleased', () => {
      expect(formatQualityLabel('ainda não lançado')).toBe('Unreleased');
      expect(formatQualityLabel('NÃO LANÇADO')).toBe('Unreleased');
      expect(formatQualityLabel('unreleased')).toBe('Unreleased');
    });

    test('deve normalizar pendente para Pending', () => {
      expect(formatQualityLabel('pendente')).toBe('Pending');
      expect(formatQualityLabel('aguardando verificação')).toBe('Pending');
    });

    test('deve normalizar gravação de cinema para CAM / Theater Rip', () => {
      expect(formatQualityLabel('gravação de cinema')).toBe('CAM / Theater Rip');
    });

    test('deve normalizar erro para Check Error', () => {
      expect(formatQualityLabel('erro na verificação')).toBe('Check Error');
    });

    test('deve manter qualidades normais como 1080p FHD ou 4K UHD', () => {
      expect(formatQualityLabel('1080p FHD')).toBe('1080p FHD');
      expect(formatQualityLabel('4K UHD')).toBe('4K UHD');
    });
  });

  describe('isItemReady', () => {
    test('deve retornar false quando item não for informado', () => {
      expect(isItemReady(null as any)).toBe(false);
    });

    test('deve verificar prontidão padrão 1080p', () => {
      expect(isItemReady({ has1080pPlus: true })).toBe(true);
      expect(isItemReady({ has1080pPlus: false })).toBe(false);
    });

    test('deve respeitar target 4k quando configurado', () => {
      expect(isItemReady({ bestQuality: '4K UHD', minQuality: '4k' })).toBe(true);
      expect(isItemReady({ bestQuality: '2160p', minQuality: '4k' })).toBe(true);
      expect(isItemReady({ bestQuality: '1080p FHD', minQuality: '4k' })).toBe(false);
    });
  });

  describe('Decomposed Release Evaluation Helpers', () => {
    test('parseTimestampMs parses valid ISO dates and returns null for invalid/throwing inputs', () => {
      expect(parseTimestampMs(null)).toBeNull();
      expect(parseTimestampMs('')).toBeNull();
      expect(parseTimestampMs('not-a-date')).toBeNull();

      const iso = '2026-05-01T12:00:00.000Z';
      expect(parseTimestampMs(iso)).toBe(new Date(iso).getTime());

      const throwingDate = {
        valueOf() {
          throw new Error('Invalid valueOf');
        },
      } as unknown as string;
      expect(parseTimestampMs(throwingDate)).toBeNull();
    });

    test('isTimestampWithinWindow validates timestamps within the 90-day release window', () => {
      const nowMs = Date.now();
      const tenDaysAgo = nowMs - 10 * 24 * 60 * 60 * 1000;
      const hundredDaysAgo = nowMs - 100 * 24 * 60 * 60 * 1000;
      const futureDate = nowMs + 5 * 24 * 60 * 60 * 1000;

      expect(isTimestampWithinWindow(null, nowMs)).toBe(false);
      expect(isTimestampWithinWindow(tenDaysAgo, nowMs)).toBe(true);
      expect(isTimestampWithinWindow(hundredDaysAgo, nowMs)).toBe(false);
      expect(isTimestampWithinWindow(futureDate, nowMs)).toBe(false);
    });

    test('extractReleaseYear and isCatalogTitleTooOld validate release year boundaries', () => {
      expect(extractReleaseYear(undefined)).toBeNull();
      expect(extractReleaseYear('N/A')).toBeNull();
      expect(extractReleaseYear('2025–2026')).toBe(2025);
      expect(extractReleaseYear(1999)).toBe(1999);

      expect(isCatalogTitleTooOld(2026, 2026)).toBe(false);
      expect(isCatalogTitleTooOld(2025, 2026)).toBe(false);
      expect(isCatalogTitleTooOld(2024, 2026)).toBe(true);
      expect(isCatalogTitleTooOld('1995', 2026)).toBe(true);
      expect(isCatalogTitleTooOld(undefined, 2026)).toBe(false);
    });

    test('evaluateExplicitReleaseDate and evaluateReadyTimestampRelease separate release strategies', () => {
      const nowMs = Date.now();
      const recentIso = new Date(nowMs - 5 * 24 * 60 * 60 * 1000).toISOString();
      const oldIso = new Date(nowMs - 120 * 24 * 60 * 60 * 1000).toISOString();

      expect(evaluateExplicitReleaseDate({}, nowMs)).toBeNull();
      expect(
        evaluateExplicitReleaseDate({ released: recentIso, has1080pPlus: true }, nowMs)
      ).toBe(true);
      expect(
        evaluateExplicitReleaseDate({ releaseDate: oldIso, has1080pPlus: true }, nowMs)
      ).toBe(false);

      expect(
        evaluateReadyTimestampRelease({ readyAt: recentIso, has1080pPlus: true, year: 2026 }, nowMs)
      ).toBe(true);
      expect(
        evaluateReadyTimestampRelease({ readyAt: recentIso, has1080pPlus: true, year: 1998 }, nowMs)
      ).toBe(false);
    });
  });

  describe('isItemNewRelease', () => {
    test('deve retornar false quando item for inválido ou não tiver readyAt', () => {
      expect(isItemNewRelease(null as any)).toBe(false);
      expect(isItemNewRelease({ readyAt: null, has1080pPlus: true })).toBe(false);
      expect(isItemNewRelease({ readyAt: new Date().toISOString(), has1080pPlus: false })).toBe(
        false
      );
    });

    test('deve retornar true para lançamentos dos últimos 3 meses', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(isItemNewRelease({ readyAt: oneHourAgo, has1080pPlus: true })).toBe(true);
      expect(isItemNewRelease({ readyAt: thirtyDaysAgo, has1080pPlus: true, year: 2026 })).toBe(
        true
      );
      expect(isItemNewRelease({ released: thirtyDaysAgo, has1080pPlus: true })).toBe(true);
    });

    test('deve retornar false para filmes antigos mesmo com readyAt recente', () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      expect(isItemNewRelease({ readyAt: oneHourAgo, has1080pPlus: true, year: '1995' })).toBe(
        false
      );
      expect(isItemNewRelease({ readyAt: oneHourAgo, has1080pPlus: true, year: 2010 })).toBe(false);
      expect(isItemNewRelease({ readyAt: oneHourAgo, has1080pPlus: true, year: '2020' })).toBe(
        false
      );
    });

    test('deve retornar false para lançamentos com mais de 3 meses (90 dias)', () => {
      const hundredDaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
      expect(isItemNewRelease({ readyAt: hundredDaysAgo, has1080pPlus: true })).toBe(false);
      expect(isItemNewRelease({ released: hundredDaysAgo, has1080pPlus: true })).toBe(false);
    });

    test('deve capturar exceção se a data for inválida ou causar erro', () => {
      const badItem = {
        has1080pPlus: true,
        readyAt: {
          valueOf() {
            throw new Error('Data inválida');
          },
        } as unknown as string,
      };
      expect(isItemNewRelease(badItem)).toBe(false);
    });
  });

  describe('isItemUnreleased', () => {
    test('deve retornar false se o item já estiver pronto (has1080pPlus true)', () => {
      expect(isItemUnreleased({ has1080pPlus: true, bestQuality: '1080p FHD' })).toBe(false);
    });

    test('deve retornar true para qualidades indicando não lançado', () => {
      expect(isItemUnreleased({ has1080pPlus: false, bestQuality: 'Unreleased' })).toBe(true);
      expect(isItemUnreleased({ has1080pPlus: false, bestQuality: 'não lançado' })).toBe(true);
      expect(isItemUnreleased({ has1080pPlus: false, bestQuality: 'indisponível' })).toBe(true);
      expect(isItemUnreleased({ has1080pPlus: false, bestQuality: 'not released' })).toBe(true);
    });

    test('deve retornar true se streamCount for 0 e não for CAM', () => {
      expect(
        isItemUnreleased({ has1080pPlus: false, streamCount: 0, bestQuality: 'Pending' })
      ).toBe(true);
    });

    test('deve retornar false se o item já foi assistido (isWatched: true)', () => {
      expect(
        isItemUnreleased({
          has1080pPlus: false,
          streamCount: 0,
          bestQuality: 'Watched',
          isWatched: true,
        })
      ).toBe(false);
      expect(
        isItemUnreleased({
          has1080pPlus: false,
          streamCount: 0,
          bestQuality: 'Pending',
          isWatched: true,
        })
      ).toBe(false);
    });

    test('deve retornar false se for gravação de cinema (CAM)', () => {
      expect(
        isItemUnreleased({ has1080pPlus: false, streamCount: 1, bestQuality: 'CAM / Theater Rip' })
      ).toBe(false);
    });
  });

  describe('resolveMovieStatus', () => {
    test('should prioritize watched over all other flags', () => {
      expect(
        resolveMovieStatus({ isWatched: true, isNew: true, ready: true, unreleased: true })
      ).toBe('watched');
    });

    test('should return new when isNew is true and not watched', () => {
      expect(
        resolveMovieStatus({ isWatched: false, isNew: true, ready: true, unreleased: false })
      ).toBe('new');
    });

    test('should return ready when ready is true and neither watched nor new', () => {
      expect(
        resolveMovieStatus({ isWatched: false, isNew: false, ready: true, unreleased: false })
      ).toBe('ready');
    });

    test('should return unreleased when unreleased is true and not watched, new, or ready', () => {
      expect(
        resolveMovieStatus({ isWatched: false, isNew: false, ready: false, unreleased: true })
      ).toBe('unreleased');
    });

    test('should fallback to waiting when all flags are false', () => {
      expect(
        resolveMovieStatus({ isWatched: false, isNew: false, ready: false, unreleased: false })
      ).toBe('waiting');
    });
  });

  describe('computeMovieStatus & enrichWatchlistItem (Domain Status Contract)', () => {
    const baseItem: WatchlistItem = {
      id: 'tt1234567',
      type: 'movie',
      name: 'Dune: Part Two',
      year: new Date().getFullYear(),
      has1080pPlus: true,
      bestQuality: '4K UHD',
      streamCount: 12,
      readyAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isWatched: false,
    };

    test('pre-computes status, labels, and flags on WatchlistItem', () => {
      const enriched = enrichWatchlistItem(baseItem, '4k');
      expect(enriched.computed).toBeDefined();
      expect(enriched.computed).toEqual({
        status: 'new',
        isWatched: false,
        isReady: true,
        isNewRelease: true,
        isUnreleased: false,
        qualityLabel: '4K UHD',
        streamsLabel: '12 sources',
        activeTargetQuality: '4k',
      });
    });

    test('computes unreleased status and label accurately when streams are 0', () => {
      const unreleasedStatus = computeMovieStatus(
        {
          ...baseItem,
          has1080pPlus: false,
          bestQuality: 'Pending',
          streamCount: 0,
          readyAt: null,
        },
        '1080p'
      );
      expect(unreleasedStatus.status).toBe('unreleased');
      expect(unreleasedStatus.isUnreleased).toBe(true);
      expect(unreleasedStatus.qualityLabel).toBe('Unreleased');
      expect(unreleasedStatus.streamsLabel).toBe('0 sources');
    });

    test('MovieCard.tsx relies on pre-computed MovieComputedStatus rather than inline status calculation helpers', () => {
      const movieCardPath = path.resolve(
        __dirname,
        '../src/components/watchlist/MovieCard.tsx'
      );
      const source = fs.readFileSync(movieCardPath, 'utf-8');
      expect(source).not.toMatch(/\bisItemNewRelease\b/);
      expect(source).not.toMatch(/\bisItemReady\b/);
      expect(source).not.toMatch(/\bisItemUnreleased\b/);
      expect(source).not.toMatch(/\bresolveMovieStatus\b/);
      expect(source).not.toMatch(/\bformatQualityLabel\b/);
    });
  });
});
