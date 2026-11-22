// Gera o PDF a partir de dist/apostila-pdf.html (rode antes: python3 build.py).
// Uso: node build-pdf.cjs [saida.pdf]
// A capa sai sem margens; o miolo sai em A4 com margens e rodapé numerado. As duas partes são unidas com pdfunite.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const RAIZ = __dirname;
const ENTRADA = path.join(RAIZ, 'dist', 'apostila-pdf.html');
const SAIDA = process.argv[2] || path.join(RAIZ, 'dist', 'Apostila-CPA-Cap1-Sistema-Financeiro-Nacional.pdf');
const TMP = path.join(RAIZ, 'dist', '.tmp');

const RODAPE = `<div style="width:100%;font-family:Nunito,Arial,sans-serif;font-size:8.5px;color:#5b6970;padding:0 14mm;display:flex;justify-content:space-between">
  <span>Apostila CPA · Capítulo 1 · Sistema Financeiro Nacional</span><span>página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  // 182 mm de largura útil (A4 menos 14 mm de cada lado) ≈ 688 px: o mapa mental é desenhado nessa largura.
  const page = await browser.newPage({ viewport: { width: 688, height: 1000 } });
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  await page.goto('file://' + ENTRADA, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  const capa = path.join(TMP, 'capa.pdf');
  const miolo = path.join(TMP, 'miolo.pdf');
  const esconder = await page.addStyleTag({ content: 'body > *:not(.capa):not(.defs-globais):not(script){display:none !important}' });
  await page.pdf({ path: capa, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' });
  await esconder.evaluate((el) => el.remove());
  await page.addStyleTag({ content: '.capa{display:none !important}' });
  await page.evaluate(() => document.querySelectorAll('.mapa-caderno').forEach((m) => m._desenhar && m._desenhar()));
  await page.pdf({
    path: miolo, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>', footerTemplate: RODAPE,
    margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '14mm' }
  });
  await browser.close();
  execFileSync('pdfunite', [capa, miolo, SAIDA]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('PDF gerado:', SAIDA, (fs.statSync(SAIDA).size / 1024).toFixed(0) + ' KB');
})();
