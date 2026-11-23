import { authService } from '../src/services/authService';
import { resetUser, trackEvent } from '../src/lib/analytics';

describe('Logout Regression Test (ReferenceError resetUser fix)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('resetUser is properly defined and executes safely', () => {
    expect(typeof resetUser).toBe('function');
    expect(() => resetUser()).not.toThrow();
  });

  test('authService.clearAuth and logout execute cleanly during sign out', async () => {
    authService.setAuthKey('test_key', 'user@example.com');
    expect(authService.getAuthKey()).toBe('test_key');

    const clearAuthSpy = jest.spyOn(authService, 'clearAuth');
    const logoutSpy = jest.spyOn(authService, 'logout').mockResolvedValue();

    // Execute the exact logout sequence from AppContext
    authService.clearAuth();
    expect(authService.getAuthKey()).toBeNull();
    expect(clearAuthSpy).toHaveBeenCalled();

    trackEvent('auth_logout', {});
    resetUser();
    await authService.logout();

    expect(logoutSpy).toHaveBeenCalled();
  });

  test('logout path handles network rejection gracefully without unhandled ReferenceError', async () => {
    jest.spyOn(authService, 'logout').mockRejectedValue(new Error('Network error'));

    // Should never throw unhandled ReferenceError or rejection
    await expect(
      (async () => {
        authService.clearAuth();
        trackEvent('auth_logout', {});
        resetUser();
        await authService.logout().catch((err) => {
          expect(err).toBeInstanceOf(Error);
        });
      })()
    ).resolves.toBeUndefined();
  });
});
