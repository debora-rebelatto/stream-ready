const express = require('express');
const { registerSystemRoutes } = require('../../server/controllers/systemController');
const requestContext = require('../../server/utils/requestContext');

jest.mock('../../server/utils/requestContext', () => ({
  getBaseUrl: jest.fn().mockReturnValue('http://localhost:7000'),
  getRequestUser: jest.fn().mockResolvedValue({ userId: 'test_user', authKey: null }),
  syncAddonUrlWithAccount: jest.fn().mockResolvedValue(true),
  runBackgroundCheck: jest.fn().mockResolvedValue({ totalChecked: 10, qualityFound: 2 }),
}));

jest.mock('../../lib/posthogLogs', () => ({
  logPostHog: jest.fn(),
}));

describe('GET /api/cron Endpoint', () => {
  let app: any;
  const originalEnv = process.env.CRON_SECRET;

  beforeEach(() => {
    delete process.env.CRON_SECRET;
    jest.clearAllMocks();
    app = express();
    registerSystemRoutes(app);
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.CRON_SECRET = originalEnv;
    } else {
      delete process.env.CRON_SECRET;
    }
  });

  const dispatchGet = (path: string, headers: Record<string, string> = {}) => {
    return new Promise<{ status: number; body: any }>((resolve) => {
      const parsedUrl = new URL(`http://localhost${path}`);
      const queryObj: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        queryObj[key] = val;
      });

      const req: any = {
        method: 'GET',
        url: path,
        path: parsedUrl.pathname,
        query: queryObj,
        headers: { ...headers },
      };

      const res: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          resolve({ status: this.statusCode, body: data });
        },
      };

      // Find registered handler for /api/cron
      const route = app._router.stack.find(
        (layer: any) => layer.route && layer.route.path === '/api/cron'
      );
      if (route) {
        route.route.stack[0].handle(req, res);
      } else {
        resolve({ status: 404, body: { error: 'Not found' } });
      }
    });
  };

  test('executes background check and returns summary when no CRON_SECRET is set', async () => {
    const res = await dispatchGet('/api/cron');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toEqual({ totalChecked: 10, qualityFound: 2 });
    expect(requestContext.runBackgroundCheck).toHaveBeenCalled();
  });

  test('blocks unauthorized request when CRON_SECRET is configured', async () => {
    process.env.CRON_SECRET = 'my_super_secret';
    const res = await dispatchGet('/api/cron');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Unauthorized');
    expect(requestContext.runBackgroundCheck).not.toHaveBeenCalled();
  });

  test('allows request when valid Authorization Bearer header is sent', async () => {
    process.env.CRON_SECRET = 'my_super_secret';
    const res = await dispatchGet('/api/cron', {
      authorization: 'Bearer my_super_secret',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(requestContext.runBackgroundCheck).toHaveBeenCalled();
  });

  test('allows request when secret is passed in query string', async () => {
    process.env.CRON_SECRET = 'my_super_secret';
    const res = await dispatchGet('/api/cron?secret=my_super_secret');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(requestContext.runBackgroundCheck).toHaveBeenCalled();
  });
});
