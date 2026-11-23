const fs = require('fs');
const path = require('path');
const swc = require('@swc/core');

const servicesDir = path.join(__dirname, '..', 'server', 'services');
const libDir = path.join(__dirname, '..', 'lib');

const mapping = {
  'cinemetaService.ts': 'cinemeta.js',
  'cryptoService.ts': 'crypto.js',
  'qualityCheckerService.ts': 'qualityChecker.js',
  'stremioAddonService.ts': 'stremioAddon.js',
  'stremioAuthService.ts': 'stremioAuth.js',
  'userDataService.ts': 'userData.js',
  'curatedListsService.ts': 'curatedLists.js',
  'tmdbService.ts': 'tmdb.js',
  'adminAnalyticsService.ts': 'adminAnalytics.js',
  'notificationService.ts': 'notifications.js',
};

console.log('Compiling server TypeScript services to lib/*.js (CommonJS)...');

for (const [tsFile, jsFile] of Object.entries(mapping)) {
  const tsPath = path.join(servicesDir, tsFile);
  if (!fs.existsSync(tsPath)) {
    console.warn(`File not found: ${tsPath}`);
    continue;
  }

  let code = fs.readFileSync(tsPath, 'utf8');

  // Replace internal service import paths with lib relative paths
  code = code
    .replace(/from\s+['"]\.\/cinemetaService(?:\.ts)?['"]/g, "from './cinemeta'")
    .replace(/from\s+['"]\.\/cryptoService(?:\.ts)?['"]/g, "from './crypto'")
    .replace(/from\s+['"]\.\/qualityCheckerService(?:\.ts)?['"]/g, "from './qualityChecker'")
    .replace(/from\s+['"]\.\/stremioAddonService(?:\.ts)?['"]/g, "from './stremioAddon'")
    .replace(/from\s+['"]\.\/stremioAuthService(?:\.ts)?['"]/g, "from './stremioAuth'")
    .replace(/from\s+['"]\.\/userDataService(?:\.ts)?['"]/g, "from './userData'");

  // Fix createRequire and relative imports for CommonJS output
  code = code
    .replace(
      /import\s*\{\s*createRequire\s*\}\s*from\s*['"]module['\"];?\s*const\s*req\s*=\s*createRequire\(import\.meta\.url\);?/g,
      ''
    )
    .replace(/\breq\(['"]\.\.\/\.\.\/lib\/db['"]\)/g, "require('./db')")
    .replace(/\breq\(/g, 'require(');

  const transformed = swc.transformSync(code, {
    module: {
      type: 'commonjs',
      strict: false,
      strictMode: false,
    },
    jsc: {
      parser: {
        syntax: 'typescript',
      },
      target: 'es2022',
    },
  });

  let outputCode = transformed.code.replace(
    /Object\.defineProperty\(target,\s*name,\s*\{/g,
    'Object.defineProperty(target, name, { configurable: true, '
  );

  const outPath = path.join(libDir, jsFile);
  fs.writeFileSync(outPath, outputCode, 'utf8');
  console.log(`✓ Compiled ${tsFile} -> lib/${jsFile}`);
}

// Copy JSON data files if they exist in servicesDir
const dataFiles = ['curatedListsData.json'];
for (const file of dataFiles) {
  const src = path.join(servicesDir, file);
  const dest = path.join(libDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${file} -> lib/${file}`);
  }
}

console.log('All backend services compiled successfully to CommonJS.');
