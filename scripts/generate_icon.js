const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generate an uncompressed PNG file from raw RGBA buffer
function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // deflate
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // CRC32
    let c = 0xffffffff;
    const typeAndData = buf.subarray(4, 8 + len);
    for (let i = 0; i < typeAndData.length; i++) {
      c ^= typeAndData[i];
      for (let k = 0; k < 8; k++) {
        c = (c >>> 1) ^ (-(c & 1) & 0xedb88320);
      }
    }
    buf.writeInt32BE((c ^ 0xffffffff) | 0, 8 + len);
    return buf;
  }

  // Scanlines with filter byte 0 (None)
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const offset = y * scanlineLength;
    rawData[offset] = 0; // Filter byte: None
    rgbaBuffer.copy(rawData, offset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const W = 256;
const H = 256;
const buf = Buffer.alloc(W * H * 4);

// Draw gradient rounded icon
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * 4;
    const dx = x - 128;
    const dy = y - 128;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);

    // Rounded rectangle bounds (radius 48)
    const rx = Math.max(0, Math.abs(x - 128) - (128 - 48));
    const ry = Math.max(0, Math.abs(y - 128) - (128 - 48));
    const cornerDist = Math.sqrt(rx * rx + ry * ry);

    if (cornerDist > 48) {
      // Transparent outside rounded rect
      buf[idx] = 0;
      buf[idx + 1] = 0;
      buf[idx + 2] = 0;
      buf[idx + 3] = 0;
      continue;
    }

    // Gradient from deep purple to indigo
    const t = (x + y) / (W + H);
    let r = Math.round(123 * (1 - t) + 79 * t);
    let g = Math.round(66 * (1 - t) + 70 * t);
    let b = Math.round(246 * (1 - t) + 229 * t);
    let a = 255;

    // Draw central play/check cinema motif (simple stylized play triangle + circle ring)
    if (distFromCenter > 75 && distFromCenter < 85) {
      // Golden outer ring
      r = 250;
      g = 204;
      b = 21;
    }

    // Draw play triangle in center
    // Triangle points: (-20, -35), (-20, 35), (35, 0)
    const inTriangle = dx >= -20 && dx <= 35 && Math.abs(dy) <= (35 - dx) * 0.7;
    if (inTriangle) {
      r = 255;
      g = 255;
      b = 255;
    }

    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
  }
}

const png = createPng(W, H, buf);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'icon.png'), png);
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  fs.writeFileSync(path.join(distDir, 'icon.png'), png);
}
console.log('Icon generated successfully!');
