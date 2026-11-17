import { api } from '../src/lib/api';
import {
  FEATURE_OPTIONS,
  POLL_VOTED_KEY,
  BETA_NOTICE_DISMISS_KEY,
  isBetaNoticeDismissed,
} from '../src/components/FeaturePollCard';

describe('Feature Roadmap Poll Client API', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('exports FEATURE_OPTIONS with expected IDs for both poll components', () => {
    expect(FEATURE_OPTIONS).toHaveLength(6);
    const ids = FEATURE_OPTIONS.map((o) => o.id);
    expect(ids).toContain('notifications');
    expect(ids).toContain('tv_shows');
    expect(ids).toContain('import_lists');
    expect(ids).toContain('debrid_filters');
    expect(ids).toContain('share_lists');
    expect(ids).toContain('other');
    expect(POLL_VOTED_KEY).toBe('stremio_poll_voted');
    expect(BETA_NOTICE_DISMISS_KEY).toBe('dismiss_beta_notice_until');
  });

  it('correctly detects if the Beta Notice is dismissed or active', () => {
    // When nothing is set, it is not dismissed (i.e. active)
    expect(isBetaNoticeDismissed()).toBe(false);

    // When dismissed until a future time, it returns true
    const futureTime = Date.now() + 1000 * 60 * 60;
    localStorage.setItem(BETA_NOTICE_DISMISS_KEY, String(futureTime));
    expect(isBetaNoticeDismissed()).toBe(true);

    // When dismissed until a past time, it returns false
    const pastTime = Date.now() - 1000 * 60;
    localStorage.setItem(BETA_NOTICE_DISMISS_KEY, String(pastTime));
    expect(isBetaNoticeDismissed()).toBe(false);
  });

  it('submits a poll vote without custom text', async () => {
    const res = await api.submitPollVote('notifications');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/poll/vote',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ option: 'notifications', customText: undefined }),
      })
    );
    expect(res.success).toBe(true);
  });

  it('submits a poll vote with custom text for other option', async () => {
    const res = await api.submitPollVote('other', 'Audio track selector');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/poll/vote',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ option: 'other', customText: 'Audio track selector' }),
      })
    );
    expect(res.success).toBe(true);
  });

  it('fetches poll status for user', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ hasVoted: true, vote: { selected_option: 'tv_shows' } }),
    });

    const status = await api.getPollStatus();
    expect(global.fetch).toHaveBeenCalledWith('/api/poll/status', expect.anything());
    expect(status.hasVoted).toBe(true);
    expect(status.vote?.selected_option).toBe('tv_shows');
  });
});
