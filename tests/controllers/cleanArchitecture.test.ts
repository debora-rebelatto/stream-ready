import {
  filterWatchlistItems,
  sortWatchlistItems,
  formatQualityLabel,
  getMovieComputedStatus,
} from '../../src/utils';
import { enrichWatchlistItem } from '../../lib/db/qualityEvaluator';
import {
  useAppController,
  useAuthController,
  useCustomListsController,
  useDashboardController,
  useLandingController,
  useManageListsController,
  useSearchController,
  useSettingsController,
  useSetupWizardController,
  useWatchlistController,
  LANDING_FAQS,
  EMOJI_OPTIONS,
} from '../../src/controllers';
import {
  LandingPageView,
  UserDashboardView,
  SettingsPageView,
} from '../../src/views';
import {
  ModalShell,
  QualitySettingsCard,
  SyncSettingsCard,
  BackupSettingsCard,
  AccountDangerCard,
  LandingHeroSection,
  QualityComparisonSection,
  FeaturesGridSection,
  HowItWorksSection,
  LandingFaqSection,
  FirstTimeSetupModal,
  SetupProgressStepper,
  SetupStepWelcome,
  SetupStepInstallStremio,
  SetupStepFeaturesTour,
  SetupStepFirstMovies,
} from '../../src/components';
import type { WatchlistItem } from '../../src/models';

const repositories = require('../../server/repositories');
const serverControllers = require('../../server/controllers');

describe('Clean Architecture Layers (models, utils, controllers, views, server repositories & controllers)', () => {
  const sampleItems: WatchlistItem[] = [
    {
      id: 'tt001',
      type: 'movie',
      name: 'Alpha Movie',
      year: '2025',
      imdbRating: '8.5',
      addedAt: '2026-01-10T10:00:00Z',
      has1080pPlus: true,
      bestQuality: '4K UHD',
      streamCount: 15,
      isWatched: false,
      customLists: ['list-1'],
    },
    {
      id: 'tt002',
      type: 'movie',
      name: 'Beta Film',
      year: '2026',
      imdbRating: '7.1',
      addedAt: '2026-02-15T10:00:00Z',
      has1080pPlus: false,
      bestQuality: 'CAM',
      streamCount: 3,
      isWatched: false,
      customLists: [],
    },
    {
      id: 'tt003',
      type: 'movie',
      name: 'Gamma Cinema',
      year: '2024',
      imdbRating: '9.0',
      addedAt: '2026-01-05T10:00:00Z',
      has1080pPlus: true,
      bestQuality: '1080p FHD',
      streamCount: 25,
      isWatched: true,
      customLists: ['list-1', 'list-2'],
    },
  ];

  describe('utils/watchlistFilter', () => {
    const enrichedSampleItems = sampleItems.map((item) => enrichWatchlistItem(item, '1080p'));

    test('filters by ready tab and excludes watched items', () => {
      const result = filterWatchlistItems(enrichedSampleItems, {
        currentTab: 'ready',
        activeCustomListId: null,
        selectedQuality: 'all',
        includeWatchedInAll: true,
        searchQuery: '',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tt001');
    });

    test('filters by watched tab', () => {
      const result = filterWatchlistItems(enrichedSampleItems, {
        currentTab: 'watched',
        activeCustomListId: null,
        selectedQuality: 'all',
        includeWatchedInAll: true,
        searchQuery: '',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tt003');
    });

    test('filters by custom list ID and search query', () => {
      const result = filterWatchlistItems(enrichedSampleItems, {
        currentTab: 'all',
        activeCustomListId: 'list-1',
        selectedQuality: 'all',
        includeWatchedInAll: true,
        searchQuery: 'alpha',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tt001');
    });

    test('sorts items by rating_desc, title_asc, and streams_desc', () => {
      const byRating = sortWatchlistItems(sampleItems, 'rating_desc');
      expect(byRating.map((i) => i.id)).toEqual(['tt003', 'tt001', 'tt002']);

      const byTitle = sortWatchlistItems(sampleItems, 'title_asc');
      expect(byTitle.map((i) => i.id)).toEqual(['tt001', 'tt002', 'tt003']);

      const byStreams = sortWatchlistItems(sampleItems, 'streams_desc');
      expect(byStreams.map((i) => i.id)).toEqual(['tt003', 'tt001', 'tt002']);
    });
  });

  describe('frontend controllers, views, and minimal components barrel exports', () => {
    test('exports all custom controller hooks and constants', () => {
      expect(typeof useAppController).toBe('function');
      expect(typeof useAuthController).toBe('function');
      expect(typeof useCustomListsController).toBe('function');
      expect(typeof useDashboardController).toBe('function');
      expect(typeof useLandingController).toBe('function');
      expect(typeof useManageListsController).toBe('function');
      expect(typeof useSearchController).toBe('function');
      expect(typeof useSettingsController).toBe('function');
      expect(typeof useSetupWizardController).toBe('function');
      expect(typeof useWatchlistController).toBe('function');
      expect(Array.isArray(LANDING_FAQS)).toBe(true);
      expect(LANDING_FAQS.length).toBeGreaterThan(0);
      expect(Array.isArray(EMOJI_OPTIONS)).toBe(true);
    });

    test('exports all page views and minimal section components', () => {
      expect(typeof LandingPageView).toBe('function');
      expect(typeof UserDashboardView).toBe('function');
      expect(typeof SettingsPageView).toBe('function');
      expect(typeof ModalShell).toBe('function');
      expect(typeof QualitySettingsCard).toBe('function');
      expect(typeof SyncSettingsCard).toBe('function');
      expect(typeof BackupSettingsCard).toBe('function');
      expect(typeof AccountDangerCard).toBe('function');
      expect(typeof LandingHeroSection).toBe('function');
      expect(typeof QualityComparisonSection).toBe('function');
      expect(typeof FeaturesGridSection).toBe('function');
      expect(typeof HowItWorksSection).toBe('function');
      expect(typeof LandingFaqSection).toBe('function');
    });

    test('exports all first-login setup wizard components', () => {
      expect(typeof FirstTimeSetupModal).toBe('function');
      expect(typeof SetupProgressStepper).toBe('function');
      expect(typeof SetupStepWelcome).toBe('function');
      expect(typeof SetupStepInstallStremio).toBe('function');
      expect(typeof SetupStepFeaturesTour).toBe('function');
      expect(typeof SetupStepFirstMovies).toBe('function');
    });

    test('exports quality adapter helpers via utils barrel', () => {
      expect(formatQualityLabel('ainda não lançado')).toBe('Unreleased');
      const enriched = enrichWatchlistItem(sampleItems[0], '1080p');
      expect(getMovieComputedStatus(enriched).isReady).toBe(true);
    });
  });

  describe('backend repositories & controllers', () => {
    test('exports all domain repositories', () => {
      expect(repositories.userRepository).toBeDefined();
      expect(repositories.watchlistRepository).toBeDefined();
      expect(repositories.customListRepository).toBeDefined();
      expect(repositories.pollRepository).toBeDefined();
      expect(repositories.analyticsRepository).toBeDefined();
      expect(typeof repositories.watchlistRepository.getItems).toBe('function');
      expect(typeof repositories.userRepository.resolveUser).toBe('function');
    });

    test('exports all Express route controllers', () => {
      expect(typeof serverControllers.registerControllers).toBe('function');
      expect(typeof serverControllers.registerAddonRoutes).toBe('function');
      expect(typeof serverControllers.registerAuthRoutes).toBe('function');
      expect(typeof serverControllers.registerWatchlistRoutes).toBe('function');
      expect(typeof serverControllers.registerCustomListRoutes).toBe('function');
      expect(typeof serverControllers.registerSystemRoutes).toBe('function');
    });
  });
});
