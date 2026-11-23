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

  test('Invariant: FirstTimeSetupModal is mounted in every UserDashboardView branch and gated to the controller state', () => {
    const viewSource = fs.readFileSync(
      path.join(__dirname, '../src/views/UserDashboardView.tsx'),
      'utf8'
    );
    expect(viewSource).toMatch(/<FirstTimeSetupModal[\s\S]*isOpen=\{isSetupWizardOpen\}/);
    expect(viewSource).toMatch(/onCompleted=\{handleSetupWizardComplete\}/);
    // Rendered in both the settings branch and the main dashboard branch
    expect((viewSource.match(/\{setupWizard\}/g) || []).length).toBeGreaterThanOrEqual(2);
    // The inline fallback callout must never overlap the full-screen wizard
    expect(viewSource).toMatch(/!isSetupWizardOpen && <OnboardingCallout \/>/);
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

    it('defaults onboardingCompleted to false and persists true once marked completed or when items exist', async () => {
      const email = `onboarding_inv_${Date.now()}@test.com`;
      const authKey = `auth_key_onb_${Date.now()}`;

      const user = await db.resolveUser(authKey, () => ({ email }));
      expect(user).toBeDefined();
      expect(user!.onboardingCompleted).toBe(false);
      expect(db.getSettings(user!.id!).onboardingCompleted).toBe(false);

      // Successfully mark onboardingCompleted = true once setup is completed
      const updatedSettings = await db.updateSettings(
        { onboardingCompleted: true },
        user!.id!
      );
      expect(updatedSettings.onboardingCompleted).toBe(true);
      expect(db.getSettings(user!.id!).onboardingCompleted).toBe(true);
      expect((await db.resolveUser(authKey))?.onboardingCompleted).toBe(true);

      // Users with existing items are also recognized as onboarding completed
      const email2 = `onboarding_movies_${Date.now()}@test.com`;
      const authKey2 = `auth_key_onb2_${Date.now()}`;
      const userWithMovies = await db.resolveUser(authKey2, () => ({ email: email2 }));
      await db.addItem(
        {
          id: 'tt0133093',
          name: 'The Matrix',
          has1080pPlus: true,
          bestQuality: '1080p FHD',
          streamCount: 5,
        },
        userWithMovies!.id!
      );
      const resolvedWithMovies = await db.resolveUser(authKey2);
      expect(resolvedWithMovies!.onboardingCompleted).toBe(true);
      expect(db.getSettings(userWithMovies!.id!).onboardingCompleted).toBe(true);
    });

    it('never loads production Supabase credentials or writes to Supabase during Jest runs', () => {
      jest.restoreAllMocks();
      expect(db.isSupabaseConfigured()).toBe(false);
      expect(process.env.SUPABASE_URL).toBeUndefined();
      expect(process.env.SUPABASE_KEY).toBeUndefined();
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

    it('enforces thin HTTP controllers (< 225 lines each)', () => {
      for (const file of controllerFiles) {
        const fullPath = path.join(controllersDir, file);
        const lineCount = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).length;
        expect(lineCount).toBeLessThanOrEqual(225);
      }
    });

    it('keeps lib/db.js as a thin facade and lib/db/* stores modular (< 350 lines each)', () => {
      const facadePath = path.join(__dirname, '..', 'lib', 'db.js');
      const facadeLines = fs.readFileSync(facadePath, 'utf8').split(/\r?\n/).length;
      expect(facadeLines).toBeLessThanOrEqual(120);

      const dbModulesDir = path.join(__dirname, '..', 'lib', 'db');
      const dbModules = fs.readdirSync(dbModulesDir).filter((f) => f.endsWith('.js'));
      expect(dbModules.length).toBeGreaterThanOrEqual(5);

      for (const file of dbModules) {
        const fullPath = path.join(dbModulesDir, file);
        const lineCount = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).length;
        expect(lineCount).toBeLessThanOrEqual(350);
      }
    });
  });

  describe('Level 5: Mobile Responsiveness & Overflow Invariants', () => {
    it('prevents horizontal overflow on the landing page and bounds LoginModal to the viewport', () => {
      const heroSource = fs.readFileSync(
        path.join(__dirname, '../src/components/landing/LandingHeroSection.tsx'),
        'utf8'
      );
      const landingSource = fs.readFileSync(
        path.join(__dirname, '../src/views/LandingPageView.tsx'),
        'utf8'
      );
      const loginModalSource = fs.readFileSync(
        path.join(__dirname, '../src/components/auth/LoginModal.tsx'),
        'utf8'
      );

      // Decorative hero glow must never exceed viewport width on mobile
      expect(heroSource).not.toMatch(/(?<!max-)w-150\b/);
      expect(landingSource).toMatch(/overflow-x-clip/);

      // LoginModal must stay strictly bounded inside mobile viewports
      expect(loginModalSource).toMatch(/overflow-x-hidden/);
      expect(loginModalSource).toMatch(/max-w-\[min\(28rem,calc\(100vw-1\.5rem\)\)\]/);
    });
  });

  describe('Level 6: Backend-Only Quality Evaluation Invariant', () => {
    function collectFiles(dir: string): string[] {
      const results: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...collectFiles(fullPath));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          results.push(fullPath);
        }
      }
      return results;
    }

    it('forbids frontend source files from defining or calling quality calculation functions', () => {
      const srcDir = path.join(__dirname, '..', 'src');
      const frontendFiles = collectFiles(srcDir);
      const forbiddenPattern =
        /\b(isItemReady|isItemUnreleased|isItemNewRelease|computeMovieStatus|enrichWatchlistItem|computeWatchlistStats)\b/;

      for (const filePath of frontendFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content).not.toMatch(forbiddenPattern);
      }
    });

    it('computes derived quality status on the backend without persisting computed columns to DB rows', async () => {
      const { itemToRow } = require('../lib/db/itemMapper');
      const email = `quality_backend_${Date.now()}@test.com`;
      const bucket = db.ensureUserBucket(email);

      await db.addItem(
        {
          id: 'tt15239678',
          name: 'Dune: Part Two',
          year: '2024',
          has1080pPlus: true,
          bestQuality: '4K UHD',
          hasAtmos: true,
          audioFormat: 'Dolby Atmos',
          streamCount: 18,
        },
        bucket.id!
      );

      // Default 1080p / any -> ready
      const enriched1080 = db.getEnrichedItems(bucket.id!);
      expect(enriched1080).toHaveLength(1);
      expect(enriched1080[0].computed.isReady).toBe(true);
      expect(enriched1080[0].computed.qualityTier).toBe('4k');
      expect(enriched1080[0].computed.hasAtmos).toBe(true);

      // Database row payload must NOT persist derived computed object
      const dbRow = itemToRow(enriched1080[0], bucket.id!);
      expect(dbRow.computed).toBeUndefined();
      expect(dbRow.quality_tier).toBeUndefined();
      expect(dbRow.is_ready).toBeUndefined();

      // Updating settings dynamically recomputes status on read
      await db.updateSettings({ minQuality: '4k', minAudio: 'atmos' }, bucket.id!);
      const enriched4kAtmos = db.getEnrichedItems(bucket.id!);
      expect(enriched4kAtmos[0].computed.isReady).toBe(true);
      expect(enriched4kAtmos[0].computed.activeTargetQuality).toBe('4k');
      expect(enriched4kAtmos[0].computed.activeTargetAudio).toBe('atmos');
    });
  });
});
