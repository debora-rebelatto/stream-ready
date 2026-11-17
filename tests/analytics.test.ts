import { trackEvent, initPostHog, identifyUser, resetUser } from '../src/lib/analytics';
import posthog from 'posthog-js';

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
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
});
