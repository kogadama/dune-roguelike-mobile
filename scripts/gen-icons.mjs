// One-off PWA icon generator: draws a pixel-art worm-eye icon on a canvas in
// headless Chromium (via Playwright) and writes PNGs to public/icons/.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const draw = `(size) => {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const P = size / 16; // 16x16 pixel grid
  const px = (gx, gy, w, h, col) => { x.fillStyle = col; x.fillRect(gx*P, gy*P, w*P, h*P); };
  // Background: night desert
  px(0,0,16,16,'#120a05');
  // Dune silhouette
  px(0,11,16,5,'#2b1a0e');
  px(0,12,16,4,'#5c3a1e');
  // Rising worm arc (sand ring)
  const ring = [[6,3],[7,2],[8,2],[9,3],[10,4],[10,5],[5,4],[5,5],[4,6],[11,6]];
  for (const [gx,gy] of ring) px(gx,gy,1,1,'#c08a4a');
  const ring2 = [[6,4],[7,3],[8,3],[9,4]];
  for (const [gx,gy] of ring2) px(gx,gy,1,1,'#e0b36c');
  // Spice eye center
  px(7,5,2,2,'#ff9433');
  px(7,5,1,1,'#ffc36e');
  // Blue-within-blue glints
  px(5,9,1,1,'#3fd0ff');
  px(10,9,1,1,'#3fd0ff');
  // Stars
  px(2,2,1,1,'#f5efe6'); px(13,1,1,1,'#f5efe6'); px(12,3,1,1,'#8f5e2f');
  return c.toDataURL('image/png');
}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
const page = await browser.newPage();
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  const dataUrl = await page.evaluate(`(${draw})(${size})`);
  const b64 = dataUrl.split(',')[1];
  writeFileSync(join(outDir, name), Buffer.from(b64, 'base64'));
  console.log('wrote', name);
}
await browser.close();
