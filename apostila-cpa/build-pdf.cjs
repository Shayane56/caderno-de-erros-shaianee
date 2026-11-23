// Gera os PDFs a partir de dist/ (rode antes: python3 build.py).
// Uso: node build-pdf.cjs --cap 2            PDF completo do capítulo 2 (capa sem margens + miolo A4 com rodapé)
//      node build-pdf.cjs --cap 2 --resumo   PDF do resumo do capítulo 2 (2 páginas)
// A capa e o miolo são unidos com pdfunite (poppler-utils).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const RAIZ = __dirname;
const DIST = path.join(RAIZ, 'dist');
const TMP = path.join(DIST, '.tmp');

// título e nome de arquivo de cada capítulo pronto
const CAPS = {
  1: { titulo: 'Sistema Financeiro Nacional', arquivo: 'Sistema-Financeiro-Nacional' },
  2: { titulo: 'Política econômica e indicadores', arquivo: 'Politica-Economica-e-Indicadores' },
  3: { titulo: 'Matemática financeira', arquivo: 'Matematica-Financeira' },
  4: { titulo: 'Regulação e infraestrutura de mercado', arquivo: 'Regulacao-e-Infraestrutura' },
  5: { titulo: 'Renda fixa', arquivo: 'Renda-Fixa' },
  6: { titulo: 'Renda variável e COE', arquivo: 'Renda-Variavel-e-COE' },
  9: { titulo: 'Produtos de crédito', arquivo: 'Produtos-de-Credito' },
  11: { titulo: 'Finanças pessoais e planejamento', arquivo: 'Financas-Pessoais-e-Planejamento' },
  14: { titulo: 'ESG', arquivo: 'ESG' },
  15: { titulo: 'Inovação e meios de pagamento', arquivo: 'Inovacao-e-Meios-de-Pagamento' }
};

const arg = (nome) => { const i = process.argv.indexOf(nome); return i >= 0 ? process.argv[i + 1] : null; };
const N = Number(arg('--cap') || 1);
const CAP = CAPS[N];
if (!CAP) { console.error('Capítulo sem configuração em build-pdf.cjs:', N); process.exit(1); }
const nn = String(N).padStart(2, '0');

const rodape = (texto) => `<div style="width:100%;font-family:Nunito,Arial,sans-serif;font-size:8.5px;color:#5b6970;padding:0 14mm;display:flex;justify-content:space-between">
  <span>${texto}</span><span>página <span class="pageNumber"></span> de <span class="totalPages"></span></span></div>`;

async function abrir(arquivo, largura) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const page = await browser.newPage({ viewport: { width: largura, height: 1000 } });
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });
  await page.goto('file://' + path.join(DIST, arquivo), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  return { browser, page };
}

async function resumo() {
  const { browser, page } = await abrir(`resumo-pdf-cap${nn}.html`, 718);
  const saida = path.join(DIST, `Apostila-CPA-Cap${N}-Resumo.pdf`);
  await page.pdf({
    path: saida, format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<div></div>',
    footerTemplate: rodape(`Apostila CPA · Resumo do Capítulo ${N} · ${CAP.titulo}`),
    margin: { top: '10mm', right: '10mm', bottom: '13mm', left: '10mm' }
  });
  await browser.close();
  console.log('PDF do resumo:', saida, (fs.statSync(saida).size / 1024).toFixed(0) + ' KB');
}

async function completo() {
  fs.mkdirSync(TMP, { recursive: true });
  // 182 mm de largura útil (A4 menos 14 mm de cada lado) ≈ 688 px: o mapa mental é desenhado nessa largura.
  const { browser, page } = await abrir(`apostila-pdf-cap${nn}.html`, 688);
  const capa = path.join(TMP, 'capa.pdf');
  const miolo = path.join(TMP, 'miolo.pdf');
  const saida = path.join(DIST, `Apostila-CPA-Cap${N}-${CAP.arquivo}.pdf`);
  const esconder = await page.addStyleTag({ content: 'body > *:not(.capa):not(.defs-globais):not(script){display:none !important}' });
  await page.pdf({ path: capa, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' });
  await esconder.evaluate((el) => el.remove());
  await page.addStyleTag({ content: '.capa{display:none !important}' });
  await page.evaluate(() => document.querySelectorAll('.mapa-caderno').forEach((m) => m._desenhar && m._desenhar()));
  await page.pdf({
    path: miolo, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<div></div>', footerTemplate: rodape(`Apostila CPA · Capítulo ${N} · ${CAP.titulo}`),
    margin: { top: '14mm', right: '14mm', bottom: '16mm', left: '14mm' }
  });
  await browser.close();
  execFileSync('pdfunite', [capa, miolo, saida]);
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('PDF gerado:', saida, (fs.statSync(saida).size / 1024).toFixed(0) + ' KB');
}

(process.argv.includes('--resumo') ? resumo() : completo()).catch((e) => { console.error(e); process.exit(1); });
