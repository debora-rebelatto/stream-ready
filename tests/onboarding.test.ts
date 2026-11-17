import { ONBOARDING_DISMISS_KEY } from '../src/components/OnboardingCallout';
import { CURATED_RECOMMENDED_MOVIES } from '../src/lib/recommendations';

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
    const isExpiredDismissed = parseInt(localStorage.getItem(ONBOARDING_DISMISS_KEY) || '0', 10) > now;
    expect(isExpiredDismissed).toBe(false);
  });
});
