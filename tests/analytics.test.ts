import {
  trackEvent,
  initPostHog,
  identifyUser,
  resetUser,
  isTrackingBlocked,
  setTrackingDisabled,
  setExcludedTrackingEmails,
  getExcludedTrackingEmails,
} from '../src/lib/analytics';
import posthog from 'posthog-js';

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    opt_out_capturing: jest.fn(),
    opt_in_capturing: jest.fn(),
  },
}));

describe('analytics.trackEvent (PostHog & Supabase)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as any).window = {};
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete (global as any).window;
    global.fetch = originalFetch;
  });

  it('sends events to the first-party Supabase API endpoint', () => {
    trackEvent('movie_added', {
      title: 'Inception',
      year: '2010',
      imdbId: 'tt1375666',
      source: 'search',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'movie_added',
          data: {
            title: 'Inception',
            year: '2010',
            imdbId: 'tt1375666',
            source: 'search',
          },
        }),
      })
    );
  });

  it('tracks addon manifest copied event', () => {
    trackEvent('addon_manifest_copied', { location: 'navbar' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'addon_manifest_copied',
          data: {
            location: 'navbar',
          },
        }),
      })
    );
  });

  it('tracks onboarding events (viewed, quick add, and dismissed)', () => {
    trackEvent('onboarding_viewed', { watchlistCount: 0 });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'onboarding_viewed',
          data: { watchlistCount: 0 },
        }),
      })
    );

    trackEvent('onboarding_quick_add_clicked', {
      movieIds: ['tt34384661', 'tt34206385'],
      source: 'onboarding_callout_batch',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'onboarding_quick_add_clicked',
          data: {
            movieIds: ['tt34384661', 'tt34206385'],
            source: 'onboarding_callout_batch',
          },
        }),
      })
    );

    trackEvent('onboarding_dismissed', { reason: 'user_closed' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'onboarding_dismissed',
          data: { reason: 'user_closed' },
        }),
      })
    );
  });

  it('captures with PostHog once initialized', () => {
    initPostHog('phc_test_key_123', 'https://us.i.posthog.com');
    expect(posthog.init).toHaveBeenCalledWith(
      'phc_test_key_123',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
      })
    );

    trackEvent('addon_install_clicked', { location: 'landing_page' });
    expect(posthog.capture).toHaveBeenCalledWith('addon_install_clicked', {
      location: 'landing_page',
    });

    identifyUser('user@example.com', { email: 'user@example.com' });
    expect(posthog.identify).toHaveBeenCalledWith('user@example.com', {
      email: 'user@example.com',
    });

    resetUser();
    expect(posthog.reset).toHaveBeenCalledTimes(1);
  });

  it('handles tracking safely without throwing when network fails', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Network offline');
    });

    expect(() => {
      trackEvent('auth_login_success', { method: 'credentials' });
    }).not.toThrow();
  });

  describe('Tracking Exclusion & Opt-Out', () => {
    beforeEach(() => {
      localStorage.clear();
      jest.clearAllMocks();
    });

    it('blocks tracking when global opt-out is enabled', () => {
      setTrackingDisabled(true);
      expect(isTrackingBlocked()).toBe(true);
      expect(posthog.opt_out_capturing).toHaveBeenCalled();

      trackEvent('addon_manifest_copied', { location: 'navbar' });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(posthog.capture).not.toHaveBeenCalled();

      setTrackingDisabled(false);
      expect(isTrackingBlocked()).toBe(false);
    });

    it('blocks tracking for accounts in the excluded list', () => {
      setExcludedTrackingEmails(['myaccount1@gmail.com', 'myaccount2@gmail.com']);
      expect(getExcludedTrackingEmails()).toEqual(
        expect.arrayContaining(['myaccount1@gmail.com', 'myaccount2@gmail.com'])
      );

      expect(isTrackingBlocked('myaccount1@gmail.com')).toBe(true);
      expect(isTrackingBlocked('myaccount2@gmail.com')).toBe(true);
      expect(isTrackingBlocked('otheruser@gmail.com')).toBe(false);

      // When logged in as an excluded user
      localStorage.setItem('stremioEmail', 'myaccount1@gmail.com');
      expect(isTrackingBlocked()).toBe(true);

      // trackEvent must not send anything to fetch or posthog
      trackEvent('movie_added', { title: 'Dune', imdbId: 'tt1160419' });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(posthog.capture).not.toHaveBeenCalled();

      // identifyUser must trigger opt-out instead of identifying
      identifyUser('myaccount1@gmail.com', { email: 'myaccount1@gmail.com' });
      expect(posthog.opt_out_capturing).toHaveBeenCalled();
      expect(posthog.identify).not.toHaveBeenCalled();
    });

    it('blocks tracking for user IDs in the excluded list', () => {
      process.env.VITE_EXCLUDED_TRACKING_USER_IDS = 'test-uuid-excluded-1,test-uuid-excluded-2';
      expect(isTrackingBlocked('test-uuid-excluded-1')).toBe(true);
      expect(isTrackingBlocked('test-uuid-excluded-2')).toBe(true);
      expect(isTrackingBlocked('random-user-id')).toBe(false);
      delete process.env.VITE_EXCLUDED_TRACKING_USER_IDS;
    });
  });
});
