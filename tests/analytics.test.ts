import {
  trackEvent,
  identifyUser,
  resetUser,
  isTrackingBlocked,
  setTrackingDisabled,
  setServerTrackingExcluded,
  setExcludedTrackingEmails,
  getExcludedTrackingEmails,
  BUILTIN_EXCLUDED_USER_IDS,
} from '../src/lib/analytics';

describe('analytics.trackEvent (Supabase)', () => {
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

  it('tracks qr landing viewed and stremio configure opened events', () => {
    trackEvent('qr_landing_viewed', {
      source: 'stremio_tv_qr',
      context: 'stremio_tv',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'qr_landing_viewed',
          data: {
            source: 'stremio_tv_qr',
            context: 'stremio_tv',
          },
        }),
      })
    );

    trackEvent('stremio_configure_opened', {
      source: 'stremio_configure',
      context: 'stremio_tv',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'stremio_configure_opened',
          data: {
            source: 'stremio_configure',
            context: 'stremio_tv',
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

  it('tracks setup wizard step and completion events', () => {
    trackEvent('onboarding_step_viewed', {
      stepId: 'welcome',
      stepNumber: 1,
      mode: 'first-login',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'onboarding_step_viewed',
          data: {
            stepId: 'welcome',
            stepNumber: 1,
            mode: 'first-login',
          },
        }),
      })
    );

    trackEvent('onboarding_step_completed', {
      stepId: 'install',
      stepNumber: 2,
      actionTaken: 'cloud_install',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'onboarding_step_completed',
          data: {
            stepId: 'install',
            stepNumber: 2,
            actionTaken: 'cloud_install',
          },
        }),
      })
    );

    trackEvent('onboarding_completed', {
      mode: 'first-login',
      installedInWizard: true,
      moviesAddedCount: 2,
      minQuality: '1080p',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/events',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          event: 'onboarding_completed',
          data: {
            mode: 'first-login',
            installedInWizard: true,
            moviesAddedCount: 2,
            minQuality: '1080p',
          },
        }),
      })
    );
  });

  it('executes identifyUser and resetUser safely without throwing', () => {
    expect(() => identifyUser('user@example.com', { email: 'user@example.com' })).not.toThrow();
    expect(() => resetUser()).not.toThrow();
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

      trackEvent('addon_manifest_copied', { location: 'navbar' });
      expect(global.fetch).not.toHaveBeenCalled();

      setTrackingDisabled(false);
      expect(isTrackingBlocked()).toBe(false);
    });

    it('does not hardcode any built-in user IDs in client code', () => {
      expect(BUILTIN_EXCLUDED_USER_IDS).toEqual([]);
    });

    it('blocks tracking when server flags the authenticated session as excluded', () => {
      expect(isTrackingBlocked()).toBe(false);

      setServerTrackingExcluded(true);
      expect(isTrackingBlocked()).toBe(true);

      trackEvent('addon_manifest_copied', { location: 'navbar' });
      expect(global.fetch).not.toHaveBeenCalled();

      setServerTrackingExcluded(false);
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

      // trackEvent must not send anything to fetch
      trackEvent('movie_added', { title: 'Dune', imdbId: 'tt1160419' });
      expect(global.fetch).not.toHaveBeenCalled();
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
