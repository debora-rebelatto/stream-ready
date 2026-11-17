import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { handleCatalog, handleMeta } from '../server/services/stremioAddonService';

describe('QR Code & TV Mobile Companion', () => {
  test('generates valid QR Code buffer using qrcode library', async () => {
    const buf = await QRCode.toBuffer('https://stremiowatchlist.vercel.app', { width: 300 });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);

    // PNG signature check
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x4e); // N
    expect(buf[3]).toBe(0x47); // G
  });

  test('generates valid QR Code SVG string', async () => {
    const svg = await QRCode.toString('https://stremiowatchlist.vercel.app', { type: 'svg' });
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('statically generated public/qr.png exists and is a valid image', () => {
    const qrPath = path.join(__dirname, '..', 'public', 'qr.png');
    expect(fs.existsSync(qrPath)).toBe(true);
    const content = fs.readFileSync(qrPath);
    expect(content.length).toBeGreaterThan(1000);
    expect(content[0]).toBe(0x89);
    expect(content[1]).toBe(0x50);
  });

  test('stremio catalog guide cards feature scannable QR poster and instructions', async () => {
    // 1. Unauthenticated guide_configure card
    const configureCatalog = await handleCatalog('movie', 'watchlist_ready', {}, '');
    expect(configureCatalog.metas).toHaveLength(1);
    const configMeta = configureCatalog.metas[0];
    expect(configMeta.id).toBe('guide_configure');
    expect(configMeta.poster).toBe('https://stremiowatchlist.vercel.app/api/qr/poster');
    expect(configMeta.genres).toContain('Scan QR Code');
    expect(configMeta.description).toContain('SCAN QR CODE');

    // 2. handleMeta for guide_configure
    const metaConfig = await handleMeta('movie', 'guide_configure', '');
    expect(metaConfig.meta?.poster).toBe('https://stremiowatchlist.vercel.app/api/qr/poster');
    expect(metaConfig.meta?.genres).toContain('Scan QR Code');

    // 3. handleMeta for guide_empty_watchlist
    const metaEmpty = await handleMeta('movie', 'guide_empty_watchlist', '');
    expect(metaEmpty.meta?.poster).toBe('https://stremiowatchlist.vercel.app/api/qr/poster');
    expect(metaEmpty.meta?.genres).toContain('Scan QR Code');
    expect(metaEmpty.meta?.description).toContain('SCAN QR CODE');
  });
});
