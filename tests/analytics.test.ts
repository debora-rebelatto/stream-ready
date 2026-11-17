import {
  trackEvent,
  initPostHog,
  identifyUser,
  resetUser,
  isTrackingBlocked,
  setTrackingDisabled,
  setExcludedTrackingEmails,
  getExcludedTrackingEmails
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

    expect(global.fetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({
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
    }));
  });

  it('tracks addon manifest copied event', () => {
    trackEvent('addon_manifest_copied', { location: 'navbar' });

    expect(global.fetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        event: 'addon_manifest_copied',
        data: {
          location: 'navbar',
        },
      }),
    }));
  });

  it('captures with PostHog once initialized', () => {
    initPostHog('phc_test_key_123', 'https://us.i.posthog.com');
    expect(posthog.init).toHaveBeenCalledWith('phc_test_key_123', expect.objectContaining({
      api_host: 'https://us.i.posthog.com',
    }));

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
      expect(isTrackingBlocked('debyr.dbr@gmail.com')).toBe(true);
      expect(isTrackingBlocked('deborarebelatto1@gmail.com')).toBe(true);
      expect(isTrackingBlocked('aa1bdc75-f539-4e11-8c90-510c0e998ce8')).toBe(true);
      expect(isTrackingBlocked('0ae027a6-56e6-41d5-a25b-86fc1e04aed4')).toBe(true);

      setExcludedTrackingEmails(['myaccount1@gmail.com', 'myaccount2@gmail.com']);
      expect(getExcludedTrackingEmails()).toEqual(
        expect.arrayContaining(['myaccount1@gmail.com', 'myaccount2@gmail.com', 'debyr.dbr@gmail.com', 'deborarebelatto1@gmail.com'])
      );

      expect(isTrackingBlocked('myaccount1@gmail.com')).toBe(true);
      expect(isTrackingBlocked('myaccount2@gmail.com')).toBe(true);
      expect(isTrackingBlocked('otheruser@gmail.com')).toBe(false);

      // When logged in as an excluded user
      localStorage.setItem('stremioEmail', 'debyr.dbr@gmail.com');
      expect(isTrackingBlocked()).toBe(true);

      // trackEvent must not send anything to fetch or posthog
      trackEvent('movie_added', { title: 'Dune', imdbId: 'tt1160419' });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(posthog.capture).not.toHaveBeenCalled();

      // identifyUser must trigger opt-out instead of identifying
      identifyUser('debyr.dbr@gmail.com', { email: 'debyr.dbr@gmail.com' });
      expect(posthog.opt_out_capturing).toHaveBeenCalled();
      expect(posthog.identify).not.toHaveBeenCalled();
    });
  });
});
