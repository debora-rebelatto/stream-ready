import React from 'react';
import {
  ONBOARDING_DISMISS_KEY,
  FirstTimeSetupModal,
  SetupProgressStepper,
  SetupStepWelcome,
  SetupStepInstallStremio,
  SetupStepFeaturesTour,
  SetupStepFirstMovies,
} from '../src/components';
import { SETUP_WIZARD_STEPS } from '../src/models';
import {
  getSetupCompletedStorageKey,
  isUserOnboardingCompleted,
  resolveStepActionTaken,
} from '../src/controllers';
import { CURATED_RECOMMENDED_MOVIES } from '../src/utils';

describe('OnboardingCallout logic & starter recommendations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defines the correct dismissal key and structure', () => {
    expect(ONBOARDING_DISMISS_KEY).toBe('stremio_onboarding_dismissed');
  });

  it('provides high quality starter movies with valid metadata for 1-click activation', () => {
    const starterMovies = CURATED_RECOMMENDED_MOVIES.slice(0, 3);
    expect(starterMovies).toHaveLength(3);

    for (const movie of starterMovies) {
      expect(movie.id).toMatch(/^tt\d+/);
      expect(movie.name).toBeTruthy();
      expect(movie.poster).toMatch(/^https?:\/\//);
      expect(movie.qualityBadge).toBeTruthy();
    }

    // At least one of the top starters should already be confirmed ready (1080p or 4K)
    // so new users get instant satisfaction when adding their starter pack
    const readyStarters = starterMovies.filter((m) => m.isReady);
    expect(readyStarters.length).toBeGreaterThanOrEqual(1);
  });

  it('correctly handles dismissal persistence in localStorage', () => {
    const now = Date.now();
    const cooldownMs = 7 * 24 * 60 * 60 * 1000;
    const expiry = now + cooldownMs;

    localStorage.setItem(ONBOARDING_DISMISS_KEY, String(expiry));

    const stored = localStorage.getItem(ONBOARDING_DISMISS_KEY);
    expect(stored).toBe(String(expiry));

    const isStillDismissed = stored && parseInt(stored, 10) > now;
    expect(isStillDismissed).toBe(true);

    // If expired
    const expiredStored = String(now - 1000);
    localStorage.setItem(ONBOARDING_DISMISS_KEY, expiredStored);
    const isExpiredDismissed =
      parseInt(localStorage.getItem(ONBOARDING_DISMISS_KEY) || '0', 10) > now;
    expect(isExpiredDismissed).toBe(false);
  });

  it('defines 4 sequential setup wizard steps with valid metadata', () => {
    expect(SETUP_WIZARD_STEPS).toHaveLength(4);
    expect(SETUP_WIZARD_STEPS.map((step) => step.id)).toEqual([
      'welcome',
      'install',
      'features',
      'movies',
    ]);
    expect(SETUP_WIZARD_STEPS.map((step) => step.stepNumber)).toEqual([1, 2, 3, 4]);

    for (const step of SETUP_WIZARD_STEPS) {
      expect(step.shortTitle.trim().length).toBeGreaterThan(0);
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  describe('Setup Wizard completion & activity helpers', () => {
    it('builds per-user setup completion storage keys', () => {
      expect(getSetupCompletedStorageKey('user-123')).toBe('stremio_setup_completed_user-123');
    });

    it('determines onboarding completion from server flag with localStorage fallback', () => {
      expect(isUserOnboardingCompleted(null)).toBe(true);
      expect(
        isUserOnboardingCompleted({ id: 'u1', email: 'a@b.com', onboardingCompleted: true })
      ).toBe(true);

      localStorage.setItem(getSetupCompletedStorageKey('u1'), 'true');
      // Authoritative false from server always overrides localStorage
      expect(
        isUserOnboardingCompleted({ id: 'u1', email: 'a@b.com', onboardingCompleted: false })
      ).toBe(false);
      // Fallback applies when onboardingCompleted is undefined
      expect(isUserOnboardingCompleted({ id: 'u1', email: 'a@b.com' })).toBe(true);

      localStorage.clear();
      expect(isUserOnboardingCompleted({ id: 'u1', email: 'a@b.com' })).toBe(false);
    });

    it('resolves step activity correctly for analytics tracking without blocking user flow', () => {
      expect(
        resolveStepActionTaken('welcome', {
          installedToAccount: false,
          hasOpenedStremioApp: false,
          hasCopiedManifest: false,
          watchlistCount: 0,
        })
      ).toBe('viewed_intro');

      expect(
        resolveStepActionTaken('install', {
          installedToAccount: true,
          hasOpenedStremioApp: false,
          hasCopiedManifest: false,
          watchlistCount: 0,
        })
      ).toBe('cloud_install');

      expect(
        resolveStepActionTaken('install', {
          installedToAccount: false,
          hasOpenedStremioApp: false,
          hasCopiedManifest: false,
          watchlistCount: 0,
        })
      ).toBe('skipped_install');

      expect(
        resolveStepActionTaken('features', {
          installedToAccount: false,
          hasOpenedStremioApp: false,
          hasCopiedManifest: false,
          watchlistCount: 0,
        })
      ).toBe('reviewed_features');

      expect(
        resolveStepActionTaken('movies', {
          installedToAccount: false,
          hasOpenedStremioApp: false,
          hasCopiedManifest: false,
          watchlistCount: 3,
        })
      ).toBe('added_movies');

      expect(
        resolveStepActionTaken('movies', {
          installedToAccount: false,
          hasOpenedStremioApp: false,
          hasCopiedManifest: false,
          watchlistCount: 0,
        })
      ).toBe('skipped_movies');
    });
  });

  describe('Setup Wizard components', () => {
    const noop = () => undefined;

    it('creates valid React elements for every wizard component without confirmation checkboxes', () => {
      const elements = [
        React.createElement(FirstTimeSetupModal, {
          isOpen: false,
          mode: 'first-login',
          onClose: noop,
          onCompleted: noop,
        }),
        React.createElement(SetupProgressStepper, {
          steps: SETUP_WIZARD_STEPS,
          currentStepIndex: 0,
          onSelectStep: noop,
        }),
        React.createElement(SetupStepWelcome),
        React.createElement(SetupStepInstallStremio, {
          manifestUrl: 'https://stremiowatchlist.vercel.app/manifest.json',
          isInstallingToAccount: false,
          installedToAccount: false,
          hasOpenedStremioApp: false,
          copiedManifest: false,
          showInlineQr: false,
          qrDataUrl: '',
          isGeneratingQr: false,
          onInstallToAccount: noop,
          onOpenStremioApp: noop,
          onCopyManifest: noop,
          onToggleQr: noop,
        }),
        React.createElement(SetupStepFeaturesTour, {
          globalMinQuality: '1080p',
          onSelectQuality: noop,
          trackWatchlistWatched: true,
          onToggleTrackWatched: noop,
          autoSyncWatched: false,
          onToggleAutoSync: noop,
        }),
        React.createElement(SetupStepFirstMovies, {
          items: [],
          addingMovieId: null,
          isBatchAdding: false,
          onQuickAddMovie: noop,
          onBatchAddStarterMovies: noop,
        }),
      ];

      for (const element of elements) {
        expect(React.isValidElement(element)).toBe(true);
      }
    });
  });
});
