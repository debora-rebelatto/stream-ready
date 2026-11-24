jest.mock('../../lib/db', () => ({
  ensureLoaded: jest.fn().mockResolvedValue(true),
  getAllUsers: jest.fn().mockReturnValue([]),
  getAllUsersItems: jest.fn().mockReturnValue([]),
  getItems: jest.fn().mockReturnValue([]),
  getSettings: jest.fn().mockReturnValue({}),
  getUserQualityCriteria: jest.fn().mockReturnValue({ minQuality: '1080p', minAudio: 'any' }),
  isItemReady: jest.fn((item: any) => Boolean(item?.has1080pPlus)),
  updateItem: jest.fn(async (_id: string, patch: any) => ({ ...patch })),
  syncWatchedWithStremio: jest.fn().mockResolvedValue({ count: 0 }),
}));

jest.mock('../../lib/qualityChecker', () => ({
  checkMovieQuality: jest.fn(),
}));

jest.mock('../../server/services/notificationOperationService', () => ({
  notificationOperationService: {
    notifyMovieReady: jest.fn().mockResolvedValue({ sent: false }),
  },
}));

const db = require('../../lib/db');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const {
  runBackgroundCheck,
  triggerUserOnDemandSync,
  userSyncThrottle,
} = require('../../server/utils/requestContext');
const { isItemUnreleased } = require('../../lib/db/qualityEvaluator');

describe('Background quality check rotation & reliability', () => {
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    jest.clearAllMocks();
    userSyncThrottle.clear();
    db.ensureLoaded.mockResolvedValue(true);
    db.getAllUsers.mockReturnValue([]);
    db.getAllUsersItems.mockReturnValue([]);
    db.getItems.mockReturnValue([]);
    db.getSettings.mockReturnValue({});
    db.getUserQualityCriteria.mockReturnValue({ minQuality: '1080p', minAudio: 'any' });
    db.isItemReady.mockImplementation((item: any) => Boolean(item?.has1080pPlus));
    db.updateItem.mockImplementation(async (id: string, patch: any) => ({ id, ...patch }));
  });

  afterAll(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  test('runBackgroundCheck forces Supabase reload and checks more than 5 unique movies on Vercel', async () => {
    process.env.VERCEL = '1';

    const pendingEntries = Array.from({ length: 12 }, (_, idx) => ({
      userId: 'user-1',
      item: {
        id: `tt00000${String(idx + 1).padStart(2, '0')}`,
        type: 'movie',
        name: `Movie ${idx + 1}`,
        year: '2026',
        has1080pPlus: false,
        bestQuality: 'CAM / Theater Rip',
        streamCount: 5,
        isWatched: false,
        lastChecked: new Date(Date.UTC(2026, 10, 20, idx)).toISOString(),
      },
    }));

    db.getAllUsersItems.mockReturnValue(pendingEntries);
    checkMovieQuality.mockResolvedValue({
      has1080pPlus: true,
      isReady: true,
      bestQuality: '4K UHD',
      hasAtmos: false,
      audioFormat: 'DDP 5.1',
      streamCount: 16,
      count1080pPlus: 8,
      checkedAt: new Date().toISOString(),
    });

    const summary = await runBackgroundCheck();

    expect(db.ensureLoaded).toHaveBeenCalledWith(true);
    expect(summary.uniqueCheckedCount).toBe(12);
    expect(summary.newlyReadyCount).toBe(12);
    expect(checkMovieQuality).toHaveBeenCalledTimes(12);
  });

  test('runBackgroundCheck prioritizes by oldest lastChecked across all users sharing a movie', async () => {
    process.env.VERCEL = '1';

    const entries = [
      // First entry for tt_shared has a newer timestamp, second has an older timestamp
      {
        userId: 'user-recent',
        item: {
          id: 'tt_shared',
          name: 'Shared Movie',
          year: '2026',
          has1080pPlus: false,
          isWatched: false,
          lastChecked: '2026-11-24T12:00:00.000Z',
        },
      },
      {
        userId: 'user-stale',
        item: {
          id: 'tt_shared',
          name: 'Shared Movie',
          year: '2026',
          has1080pPlus: false,
          isWatched: false,
          lastChecked: '2026-11-20T00:00:00.000Z',
        },
      },
      {
        userId: 'user-other',
        item: {
          id: 'tt_middle',
          name: 'Middle Movie',
          year: '2026',
          has1080pPlus: false,
          isWatched: false,
          lastChecked: '2026-11-22T00:00:00.000Z',
        },
      },
    ];

    db.getAllUsersItems.mockReturnValue(entries);
    const checkedOrder: string[] = [];
    checkMovieQuality.mockImplementation(async (id: string) => {
      checkedOrder.push(id);
      return {
        has1080pPlus: false,
        isReady: false,
        bestQuality: 'CAM / Theater Rip',
        streamCount: 4,
        checkedAt: new Date().toISOString(),
      };
    });

    await runBackgroundCheck();

    expect(checkedOrder[0]).toBe('tt_shared');
    // Both users sharing tt_shared must be updated
    expect(db.updateItem).toHaveBeenCalledWith('tt_shared', expect.any(Object), 'user-recent');
    expect(db.updateItem).toHaveBeenCalledWith('tt_shared', expect.any(Object), 'user-stale');
  });

  test('runBackgroundCheck does not overwrite existing movie status on transient Check Error', async () => {
    db.getAllUsersItems.mockReturnValue([
      {
        userId: 'user-1',
        item: {
          id: 'tt29611136',
          name: 'Wicker',
          year: '2026',
          has1080pPlus: false,
          bestQuality: 'CAM / Theater Rip',
          streamCount: 7,
          isWatched: false,
          lastChecked: '2026-11-23T06:49:38.390Z',
        },
      },
    ]);

    checkMovieQuality.mockResolvedValue({
      error: 'Torrentio responded with status 522',
      has1080pPlus: false,
      isReady: false,
      bestQuality: 'Check Error',
      streamCount: 0,
      checkedAt: new Date().toISOString(),
    });

    const summary = await runBackgroundCheck();

    expect(summary.uniqueCheckedCount).toBe(1);
    expect(db.updateItem).not.toHaveBeenCalled();
  });

  test('triggerUserOnDemandSync sorts pending items by oldest lastChecked and updates non-ready items to advance rotation', async () => {
    const items = [
      {
        id: 'tt_newest',
        name: 'Newest Added',
        year: '2026',
        has1080pPlus: false,
        isWatched: false,
        lastChecked: '2026-11-24T12:00:00.000Z',
      },
      {
        id: 'tt_newer_2',
        name: 'Newer 2',
        year: '2026',
        has1080pPlus: false,
        isWatched: false,
        lastChecked: '2026-11-24T11:00:00.000Z',
      },
      {
        id: 'tt_newer_3',
        name: 'Newer 3',
        year: '2026',
        has1080pPlus: false,
        isWatched: false,
        lastChecked: '2026-11-24T10:00:00.000Z',
      },
      {
        id: 'tt_newer_4',
        name: 'Newer 4',
        year: '2026',
        has1080pPlus: false,
        isWatched: false,
        lastChecked: '2026-11-24T09:00:00.000Z',
      },
      {
        id: 'tt_newer_5',
        name: 'Newer 5',
        year: '2026',
        has1080pPlus: false,
        isWatched: false,
        lastChecked: '2026-11-24T08:00:00.000Z',
      },
      {
        id: 'tt29611136',
        name: 'Wicker',
        year: '2026',
        has1080pPlus: false,
        isWatched: false,
        lastChecked: '2026-11-23T06:49:38.390Z',
      },
    ];

    db.getItems.mockReturnValue(items);
    checkMovieQuality.mockImplementation(async (id: string) => ({
      has1080pPlus: id === 'tt29611136',
      isReady: id === 'tt29611136',
      bestQuality: id === 'tt29611136' ? '4K UHD' : 'CAM / Theater Rip',
      streamCount: id === 'tt29611136' ? 16 : 7,
      checkedAt: new Date().toISOString(),
    }));

    triggerUserOnDemandSync('auth-key', 'user-1');

    // Wait for async IIFE microtasks to finish
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    const checkedIds = checkMovieQuality.mock.calls.map((call: any[]) => call[0]);
    expect(checkedIds).toContain('tt29611136');
    expect(checkedIds).not.toContain('tt_newest');
    // All 5 checked items should have their lastChecked updated so rotation advances
    expect(db.updateItem).toHaveBeenCalledTimes(5);
  });

  test('runBackgroundCheck runs quality checks before watched sync so slow watched sync cannot starve checks', async () => {
    const callOrder: string[] = [];

    db.getAllUsers.mockReturnValue([
      { id: 'user-1', email: 'test@example.com', authKey: 'key-1', settings: { autoSyncWatched: true } },
    ]);
    db.getAllUsersItems.mockReturnValue([
      {
        userId: 'user-1',
        item: {
          id: 'tt29611136',
          name: 'Wicker',
          year: '2026',
          has1080pPlus: false,
          isWatched: false,
          lastChecked: '2026-11-23T06:49:38.390Z',
        },
      },
    ]);

    checkMovieQuality.mockImplementation(async () => {
      callOrder.push('checkMovieQuality');
      return {
        has1080pPlus: true,
        isReady: true,
        bestQuality: '4K UHD',
        streamCount: 16,
        checkedAt: new Date().toISOString(),
      };
    });

    db.syncWatchedWithStremio.mockImplementation(async () => {
      callOrder.push('syncWatchedWithStremio');
      return { count: 0 };
    });

    await runBackgroundCheck();

    expect(callOrder).toEqual(['checkMovieQuality', 'syncWatchedWithStremio']);
  });

  test('isItemUnreleased does not misclassify Check Error as Unreleased', () => {
    expect(
      isItemUnreleased({
        has1080pPlus: false,
        streamCount: 0,
        bestQuality: 'Check Error',
        isWatched: false,
      })
    ).toBe(false);
  });
});
