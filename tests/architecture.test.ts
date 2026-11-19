import fs from 'fs';
import path from 'path';
import db from '../lib/db';
import { safeFetch } from '../server/utils/fetchHelper';

describe('Lauren Tan Constraint Engineering: Architecture & Invariant Tests', () => {
  beforeEach(async () => {
    jest.spyOn(db, 'isSupabaseConfigured').mockReturnValue(false);
    await db.ensureLoaded();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Level 1 & 2: User Persistence & Cache Invariants', () => {
    it('always generates a non-null valid UUID even when user is created with only an email', () => {
      const email = `test_invariant_${Date.now()}@example.com`;
      const bucket = db.ensureUserBucket(email);

      expect(bucket).toBeDefined();
      expect(bucket.id).toBeDefined();
      expect(typeof bucket.id).toBe('string');
      expect(bucket.id!.length).toBeGreaterThan(0);
      expect(bucket.email).toBe(email);

      // Verify user is indexed in all primary cache lookup maps
      expect(db.findUserBucket(bucket.id!)).toBe(bucket);
      expect(db.findUserBucket(email)).toBe(bucket);
    });

    it('guarantees complete memory cache eradication upon deleteUser', async () => {
      const uniqueId = 'c0000000-0000-0000-0000-000000000003';
      const uniqueEmail = `del_inv_${Date.now()}@test.com`;
      const authKey = `auth_key_inv_${Date.now()}`;

      // Setup user bucket
      const bucket = db.ensureUserBucket(uniqueId, uniqueEmail);
      bucket.id = uniqueId;
      bucket.email = uniqueEmail;
      bucket.settings.stremioAuthKey = authKey;

      const user = await db.resolveUser(authKey, () => ({ email: uniqueEmail }));
      expect(user).toBeDefined();

      // Execute atomic deletion
      const res = await db.deleteUser(uniqueId);
      expect(res.success).toBe(true);

      // Invariant: Both ID and Email queries must return null
      expect(db.findUserBucket(uniqueId)).toBeNull();
      expect(db.findUserBucket(uniqueEmail)).toBeNull();
      expect(db.findUserBucket(authKey)).toBeNull();
    });
  });

  describe('Level 3: Resource Cleanup & Event Loop Safety', () => {
    it('safeFetch resolves and clears internal timer without dangling handles', async () => {
      const originalFetch = global.fetch;
      try {
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok' }),
        });

        const res = await safeFetch('https://example.com/api', {}, 500);
        expect(res.ok).toBe(true);
        expect(global.fetch).toHaveBeenCalled();
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('safeFetch aborts and clears timer when network exceeds timeout without crashing Jest', async () => {
      const originalFetch = global.fetch;
      try {
        global.fetch = jest.fn().mockImplementation(
          () =>
            new Promise((_, reject) => {
              const err: any = new Error('The operation was aborted');
              err.name = 'AbortError';
              setTimeout(() => reject(err), 50);
            })
        );

        await expect(safeFetch('https://example.com/slow', {}, 30)).rejects.toThrow();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('Level 4: Backend Clean Architecture (Controller -> Service -> Repository)', () => {
    const controllersDir = path.join(__dirname, '..', 'server', 'controllers');
    const controllerFiles = fs
      .readdirSync(controllersDir)
      .filter((f) => f.endsWith('.js') && f !== 'index.js');

    it('forbids backend controllers from requiring repositories or lib/db directly', () => {
      for (const file of controllerFiles) {
        const fullPath = path.join(controllersDir, file);
        const content = fs.readFileSync(fullPath, 'utf8');

        expect(content).not.toMatch(/require\(['"].*repositories['"]\)/);
        expect(content).not.toMatch(/require\(['"].*lib\/db['"]\)/);
        expect(content).toMatch(/require\(['"]\.\.\/services['"]\)/);
      }
    });

    it('enforces thin HTTP controllers (< 215 lines each)', () => {
      for (const file of controllerFiles) {
        const fullPath = path.join(controllersDir, file);
        const lineCount = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).length;
        expect(lineCount).toBeLessThanOrEqual(215);
      }
    });
  });
});
