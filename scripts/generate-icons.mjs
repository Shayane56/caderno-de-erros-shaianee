/**
 * Gera os ícones PNG do PWA a partir de SVG (identidade Mimo).
 * Uso: npm run icons   (requer Playwright com Chromium instalado)
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'public');

// Logo do Mimo (livro aberto + coração), desenhada em 64×64 e ampliada.
const logo = `
  <defs>
    <linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F49BC0"/><stop offset="1" stop-color="#D84A89"/></linearGradient>
    <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7B4CE"/><stop offset="1" stop-color="#E9789F"/></linearGradient>
  </defs>
  <path d="M32 21 C27 13 17 15 18 23 C19 28 26 31 32 36 C38 31 45 28 46 23 C47 15 37 13 32 21Z" fill="url(#h)"/>
  <path d="M9 41 C17 37 26 38 32 43 C38 38 47 37 55 41 L55 52 C47 48 38 49 32 54 C26 49 17 48 9 52Z" fill="url(#b)"/>
  <path d="M12 38 C19 35 27 36 32 40 L32 50 C27 46 19 45 12 48Z" fill="#FFF4F8"/>
  <path d="M52 38 C45 35 37 36 32 40 L32 50 C37 46 45 45 52 48Z" fill="#FFF4F8"/>
  <path d="M32 40 V50" stroke="#E9789F" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M50 12 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2z" fill="#B9A3F0"/>
  <circle cx="14" cy="16" r="1.8" fill="#F49BC0"/>`;

const svg = ({ rounded, scale }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FDEDF5"/>
      <stop offset="1" stop-color="#E9DEFC"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(256 262) scale(${6.2 * scale}) translate(-32 -33)">${logo}</g>
</svg>`;

const targets = [
  { file: 'pwa-192x192.png', size: 192, rounded: true, scale: 1 },
  { file: 'pwa-512x512.png', size: 512, rounded: true, scale: 1 },
  { file: 'maskable-512x512.png', size: 512, rounded: false, scale: 0.78 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, scale: 0.92 },
];

await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg(t).replace('width="512" height="512"', `width="${t.size}" height="${t.size}"`)}</body></html>`,
  );
  const buffer = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: t.size, height: t.size } });
  await writeFile(path.join(out, t.file), buffer);
  console.log('✓', t.file);
}
await browser.close();
