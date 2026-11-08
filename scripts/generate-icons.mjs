/**
 * Gera os ícones PNG do PWA a partir de SVG (identidade rosa).
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

const glyph = (scale) => `
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="152" y="104" width="208" height="296" rx="34" fill="#FFFFFF"/>
    <rect x="152" y="104" width="44" height="296" rx="22" fill="#F9D5E5"/>
    <path d="M228 196h96M228 244h96M228 292h60" stroke="#D98BAE" stroke-width="20" stroke-linecap="round"/>
    <path d="M300 338l24 24 46-54" stroke="#DB2777" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>`;

const svg = ({ rounded, scale }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#EC8DB6"/>
      <stop offset="1" stop-color="#DB2777"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="url(#g)"/>
  <circle cx="410" cy="96" r="10" fill="#FFFFFF" opacity="0.55"/>
  <circle cx="440" cy="140" r="5" fill="#FFFFFF" opacity="0.45"/>
  ${glyph(scale)}
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
