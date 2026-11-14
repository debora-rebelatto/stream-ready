import { cn, formatQualityLabel, isItemReady, isItemNewRelease, isItemUnreleased } from '../src/lib/utils';

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

  describe('isItemNewRelease', () => {
    test('deve retornar false quando item for inválido ou não tiver readyAt', () => {
      expect(isItemNewRelease(null as any)).toBe(false);
      expect(isItemNewRelease({ readyAt: null, has1080pPlus: true })).toBe(false);
      expect(isItemNewRelease({ readyAt: new Date().toISOString(), has1080pPlus: false })).toBe(false);
    });

    test('deve retornar true para lançamentos das últimas 48 horas', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      expect(isItemNewRelease({ readyAt: oneHourAgo, has1080pPlus: true })).toBe(true);
    });

    test('deve retornar false para lançamentos com mais de 48 horas', () => {
      const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
      expect(isItemNewRelease({ readyAt: threeDaysAgo, has1080pPlus: true })).toBe(false);
    });

    test('deve capturar exceção se a data for inválida ou causar erro', () => {
      const badItem = {
        has1080pPlus: true,
        readyAt: {
          valueOf() {
            throw new Error('Data inválida');
          }
        } as unknown as string
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
      expect(isItemUnreleased({ has1080pPlus: false, streamCount: 0, bestQuality: 'Pending' })).toBe(true);
    });

    test('deve retornar false se o item já foi assistido (isWatched: true)', () => {
      expect(isItemUnreleased({ has1080pPlus: false, streamCount: 0, bestQuality: 'Watched', isWatched: true })).toBe(false);
      expect(isItemUnreleased({ has1080pPlus: false, streamCount: 0, bestQuality: 'Pending', isWatched: true })).toBe(false);
    });

    test('deve retornar false se for gravação de cinema (CAM)', () => {
      expect(isItemUnreleased({ has1080pPlus: false, streamCount: 1, bestQuality: 'CAM / Theater Rip' })).toBe(false);
    });
  });
});
