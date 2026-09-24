// Generates the app icons (pixel-art green button with "+1") as PNGs, with no dependencies.
// Run: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [0x07, 0x0a, 0x08], GREEN = [0x39, 0xff, 0x6a], INK = [0x04, 0x10, 0x07];

// 32×32 artwork: a ring, a button, and "+1" drawn in 2×2 blocks.
function artwork() {
  const px = Array.from({ length: 32 }, () => Array(32).fill(null));
  for (let y = 5; y <= 26; y++) for (let x = 5; x <= 26; x++) {
    const edge = x === 5 || x === 26 || y === 5 || y === 26;
    const inner = x >= 7 && x <= 24 && y >= 7 && y <= 24;
    if (edge || inner) px[y][x] = GREEN;
  }
  const glyphs = [
    { x: 9, y: 11, rows: ['...', '.X.', 'XXX', '.X.', '...'] },
    { x: 17, y: 11, rows: ['.X.', 'XX.', '.X.', '.X.', 'XXX'] }
  ];
  for (const g of glyphs) g.rows.forEach((row, r) => [...row].forEach((c, col) => {
    if (c !== 'X') return;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) px[g.y + r * 2 + dy][g.x + col * 2 + dx] = INK;
  }));
  return px;
}

function render(size, grid) {
  const art = artwork(), off = (grid - 32) / 2, rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = Math.floor((x * grid) / size - off), gy = Math.floor((y * grid) / size - off);
    let c = art[gy] && art[gy][gx];
    if (!c) {
      // Soft phosphor glow behind the button.
      const d = Math.hypot(x / size - 0.5, y / size - 0.5), k = Math.max(0, 1 - d / 0.55) ** 2 * 0.22;
      c = BG.map((v, i) => Math.round(v + (GREEN[i] - v) * k));
    }
    rgba.set([...c, 255], (y * size + x) * 4);
  }
  return png(size, size, rgba);
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4), crc = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type), data]);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', render(192, 32));
writeFileSync('icons/icon-512.png', render(512, 32));
writeFileSync('icons/apple-touch-icon.png', render(180, 32));
writeFileSync('icons/icon-maskable-512.png', render(512, 40)); // extra margin for the maskable safe zone
console.log('icons written');
